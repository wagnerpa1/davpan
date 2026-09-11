import { describe, expect, it, vi } from "vitest";
import { loadTourRegistrationOverview } from "@/lib/tours/registration-overview";

describe("loadTourRegistrationOverview", () => {
  it("fetches self registrations for a non-parent user", async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "tour_participants") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "part-1",
                  tour_id: "tour-1",
                  status: "confirmed",
                  waitlist_position: null,
                  child_profile_id: null,
                  child_profiles: null,
                  tours: {
                    id: "tour-1",
                    title: "Klettertour",
                    status: "open",
                    start_date: "2026-06-01",
                  },
                },
              ],
              error: null,
            }),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const overview = await loadTourRegistrationOverview(
      mockSupabase as unknown as Parameters<
        typeof loadTourRegistrationOverview
      >[0],
      "user-123",
      false,
    );

    expect(overview.isParent).toBe(false);
    expect(overview.tabs).toHaveLength(1);
    expect(overview.tabs[0].id).toBe("self");
    expect(overview.tabs[0].registrations).toHaveLength(1);
    expect(overview.tabs[0].registrations[0].tour.title).toBe("Klettertour");
  });

  it("fetches self and child registrations concurrently for a parent user", async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "tour_participants") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "part-1",
                  tour_id: "tour-1",
                  status: "confirmed",
                  waitlist_position: null,
                  child_profile_id: null,
                  child_profiles: null,
                  tours: {
                    id: "tour-1",
                    title: "Eltern Tour",
                    status: "open",
                    start_date: "2026-06-01",
                  },
                },
                {
                  id: "part-2",
                  tour_id: "tour-2",
                  status: "pending",
                  waitlist_position: null,
                  child_profile_id: "child-1",
                  child_profiles: {
                    id: "child-1",
                    full_name: "Lina",
                  },
                  tours: {
                    id: "tour-2",
                    title: "Kinder Tour",
                    status: "open",
                    start_date: "2026-07-01",
                  },
                },
              ],
              error: null,
            }),
          };
        }

        if (table === "child_profiles") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "child-1",
                  full_name: "Lina",
                },
              ],
              error: null,
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const overview = await loadTourRegistrationOverview(
      mockSupabase as unknown as Parameters<
        typeof loadTourRegistrationOverview
      >[0],
      "user-parent",
      true,
    );

    expect(overview.isParent).toBe(true);
    expect(overview.tabs).toHaveLength(2);

    // Self tab
    expect(overview.tabs[0].id).toBe("self");
    expect(overview.tabs[0].registrations).toHaveLength(1);
    expect(overview.tabs[0].registrations[0].tour.title).toBe("Eltern Tour");

    // Child tab
    expect(overview.tabs[1].id).toBe("child-child-1");
    expect(overview.tabs[1].label).toBe("Lina");
    expect(overview.tabs[1].registrations).toHaveLength(1);
    expect(overview.tabs[1].registrations[0].tour.title).toBe("Kinder Tour");
  });
});
