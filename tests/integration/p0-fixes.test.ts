import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@/utils/supabase/server";

/**
 * Integration Tests for P0 Fixes
 *
 * These tests verify:
 * - C1: Tour capacity race conditions eliminated
 * - C2: Single-source-of-truth for waitlist promotion
 * - C3: Material inventory atomicity
 * - C4: Tour status auto-sync
 * - C5: Resource booking conflict detection
 */

describe("P0 Fixes – Architectural Integrity", () => {
  let supabase: ReturnType<typeof createClient>;
  let testTourId: string;
  let testUserId: string;

  beforeAll(async () => {
    supabase = await createClient();

    // Create test tour with max_participants=2
    const { data: tour, error: tourError } = await supabase
      .from("tours")
      .insert({
        title: "[TEST] P0 Capacity Test",
        start_date: "2026-04-01",
        max_participants: 2,
        status: "open",
        created_by: testUserId,
      })
      .select("id")
      .single();

    if (tourError) throw tourError;
    testTourId = tour.id;
  });

  afterAll(async () => {
    // Cleanup
    await supabase.from("tours").delete().eq("id", testTourId);
  });

  describe("C1: Tour Capacity Race Condition", () => {
    it("should prevent over-booking even with concurrent registrations", async () => {
      // Simulate two concurrent registrations
      const userId1 = "00000000-0000-0000-0000-000000000001";
      const userId2 = "00000000-0000-0000-0000-000000000002";

      const results = await Promise.all([
        supabase.rpc("register_for_tour_atomic", {
          p_tour_id: testTourId,
          p_user_id: userId1,
          p_child_id: null,
          p_materials: null,
        }),
        supabase.rpc("register_for_tour_atomic", {
          p_tour_id: testTourId,
          p_user_id: userId2,
          p_child_id: null,
          p_materials: null,
        }),
      ]);

      // Both should succeed and get different statuses
      const statuses = results.map((r) => r.data?.status).filter(Boolean);

      expect(statuses).toContain("pending");
      expect(statuses.length).toBe(2);

      // Verify tour is marked full
      const { data: tour } = await supabase
        .from("tours")
        .select("status")
        .eq("id", testTourId)
        .single();

      expect(tour?.status).toBe("full");
    });

    it("should add third registration to waitlist", async () => {
      const userId3 = "00000000-0000-0000-0000-000000000003";

      const { data: result, error } = await supabase.rpc(
        "register_for_tour_atomic",
        {
          p_tour_id: testTourId,
          p_user_id: userId3,
          p_child_id: null,
          p_materials: null,
        },
      );

      expect(error).toBeNull();
      expect(result?.status).toBe("waitlist");
      expect(result?.waitlist_position).toBe(1);
    });
  });

  describe("C2: Single-Source-of-Truth for Waitlist Promotion", () => {
    it("should promote only first waitlist participant", async () => {
      // Get first waitlist
      const { data: firstWaitlist } = await supabase
        .from("tour_participants")
        .select("id, user_id")
        .eq("tour_id", testTourId)
        .eq("status", "waitlist")
        .order("waitlist_position", { ascending: true })
        .limit(1)
        .single();

      if (!firstWaitlist) return;

      // Cancel a pending to free capacity
      const { data: pending } = await supabase
        .from("tour_participants")
        .select("id")
        .eq("tour_id", testTourId)
        .eq("status", "pending")
        .limit(1)
        .single();

      if (!pending) return;

      // Use new RPC for promotion
      const { data: promoted, error } = await supabase.rpc(
        "promote_first_waitlist",
        { p_tour_id: testTourId },
      );

      expect(error).toBeNull();
      expect(promoted?.promoted_count).toBe(1);
      expect(promoted?.promoted_user_id).toBe(firstWaitlist.user_id);

      // Verify status changed atomically
      const { data: promotedParticipant } = await supabase
        .from("tour_participants")
        .select("status")
        .eq("id", firstWaitlist.id)
        .single();

      expect(promotedParticipant?.status).toBe("confirmed");
    });
  });

  describe("C3: Material Inventory Atomicity", () => {
    it("should prevent inventory underflow with concurrent reservations", async () => {
      // Create test material with quantity=1
      const { data: matType, error: matTypeError } = await supabase
        .from("material_types")
        .insert({ name: "[TEST] Helmet" })
        .select("id")
        .single();

      if (matTypeError) throw matTypeError;

      const { data: inventory, error: invError } = await supabase
        .from("material_inventory")
        .insert({
          material_type_id: matType.id,
          size: "L",
          quantity_total: 1,
          quantity_available: 1,
        })
        .select("id")
        .single();

      if (invError) throw invError;

      const userId1 = "00000000-0000-0000-0000-000000000004";
      const userId2 = "00000000-0000-0000-0000-000000000005";

      // Simulate concurrent reservations
      const results = await Promise.all([
        supabase.rpc("reserve_material_for_tour_atomic", {
          p_tour_id: testTourId,
          p_user_id: userId1,
          p_child_id: null,
          p_material_inventory_id: inventory.id,
          p_quantity: 1,
        }),
        supabase.rpc("reserve_material_for_tour_atomic", {
          p_tour_id: testTourId,
          p_user_id: userId2,
          p_child_id: null,
          p_material_inventory_id: inventory.id,
          p_quantity: 1,
        }),
      ]);

      // One should succeed, one should fail
      const hasSuccess = results.some((r) => r.data?.reservation_id);
      const hasError = results.some((r) =>
        r.error?.message?.includes("Insufficient"),
      );

      expect(hasSuccess).toBe(true);
      expect(hasError).toBe(true);

      // Verify final inventory state
      const { data: finalInv } = await supabase
        .from("material_inventory")
        .select("quantity_available")
        .eq("id", inventory.id)
        .single();

      expect(finalInv?.quantity_available).toBe(0);

      // Cleanup
      await supabase.from("material_types").delete().eq("id", matType.id);
    });
  });

  describe("C4: Tour Status Auto-Sync", () => {
    it("should automatically sync tour status on participant updates", async () => {
      // Tour should still be 'full' from earlier test
      let { data: tour } = await supabase
        .from("tours")
        .select("status")
        .eq("id", testTourId)
        .single();

      expect(tour?.status).toBe("full");

      // Cancel a pending participant
      const { data: pending } = await supabase
        .from("tour_participants")
        .select("id")
        .eq("tour_id", testTourId)
        .eq("status", "pending")
        .limit(1)
        .single();

      if (!pending) return;

      await supabase
        .from("tour_participants")
        .update({ status: "cancelled" })
        .eq("id", pending.id);

      // Trigger should auto-update tour status
      // (Give DB a moment to execute trigger)
      await new Promise((r) => setTimeout(r, 100));

      ({ data: tour } = await supabase
        .from("tours")
        .select("status")
        .eq("id", testTourId)
        .single());

      expect(tour?.status).toBe("open");
    });
  });

  describe("C5: Resource Booking Conflict Detection", () => {
    it("should prevent overlapping resource bookings", async () => {
      // Create test resource
      const { data: resource, error: resError } = await supabase
        .from("resources")
        .insert({ name: "[TEST] Tour Bus" })
        .select("id")
        .single();

      if (resError) throw resError;

      const userId = "00000000-0000-0000-0000-000000000006";
      const startDate = "2026-04-01T08:00:00Z";
      const endDate = "2026-04-01T18:00:00Z";

      // First booking should succeed
      const { data: booking1, error: err1 } = await supabase.rpc(
        "book_resource_for_tour_atomic",
        {
          p_resource_id: resource.id,
          p_tour_id: testTourId,
          p_start_date: startDate,
          p_end_date: endDate,
          p_user_id: userId,
        },
      );

      expect(err1).toBeNull();
      expect(booking1?.booking_id).toBeTruthy();

      // Overlapping booking should fail
      const { data: booking2, error: err2 } = await supabase.rpc(
        "book_resource_for_tour_atomic",
        {
          p_resource_id: resource.id,
          p_tour_id: "00000000-0000-0000-0000-000000000099", // Different tour
          p_start_date: "2026-04-01T12:00:00Z", // Overlaps
          p_end_date: "2026-04-01T15:00:00Z",
          p_user_id: userId,
        },
      );

      expect(err2?.message).toContain("already booked");

      // Cleanup
      await supabase.from("resources").delete().eq("id", resource.id);
    });
  });
});
