import { describe, expect, it, vi } from "vitest";
import { resolveAdminSystemTargets } from "../../src/lib/notifications/admin-targeting";

function createSupabaseTargetingMock() {
  return {
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() =>
              Promise.resolve({
                data: [{ id: "u-guide" }, { id: "u-admin" }],
              }),
            ),
          })),
        };
      }

      if (table === "notification_preferences") {
        return {
          select: vi.fn(() => ({
            overlaps: vi.fn(() =>
              Promise.resolve({ data: [{ user_id: "u-group-1" }] }),
            ),
          })),
        };
      }

      if (table === "child_notification_preferences") {
        return {
          select: vi.fn(() => ({
            overlaps: vi.fn(() =>
              Promise.resolve({ data: [{ child_id: "c-group-1" }] }),
            ),
          })),
        };
      }

      if (table === "child_profiles") {
        return {
          select: vi.fn(() => Promise.resolve({ data: [{ id: "c1" }] })),
        };
      }

      throw new Error(`Unexpected table in test: ${table}`);
    }),
  };
}

describe("resolveAdminSystemTargets", () => {
  it("liefert rollenziele für roles-modus", async () => {
    const supabase = createSupabaseTargetingMock();

    const result = await resolveAdminSystemTargets(
      supabase as never,
      "roles",
      ["guide", "admin"],
      [],
    );

    expect(result.userIds).toEqual(["u-guide", "u-admin"]);
    expect(result.childIds).toEqual([]);
  });

  it("liefert gruppenziele für tour_groups-modus", async () => {
    const supabase = createSupabaseTargetingMock();

    const result = await resolveAdminSystemTargets(
      supabase as never,
      "tour_groups",
      [],
      ["11111111-1111-4111-8111-111111111111"],
    );

    expect(result.userIds).toEqual(["u-group-1"]);
    expect(result.childIds).toEqual(["c-group-1"]);
  });
});
