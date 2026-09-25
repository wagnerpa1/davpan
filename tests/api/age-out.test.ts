import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/cron/age-out/route";
import { loadTourRegistrationOverview } from "@/lib/tours/registration-overview";
import { createAdminClient } from "@/utils/supabase/admin";

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("Age-Out Automation and Child History Continuity", () => {
  const createAdminClientMock = vi.mocked(createAdminClient);

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  describe("Cron Route: /api/cron/age-out", () => {
    it("returns 401 when CRON_SECRET is set and authorization header is invalid", async () => {
      process.env.CRON_SECRET = "super-secret-token";

      const req = new NextRequest("http://localhost:3000/api/cron/age-out", {
        headers: { authorization: "Bearer wrong-token" },
      });

      const response = await GET(req);
      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toContain("Nicht autorisierter");
    });

    it("executes process_child_age_out RPC when authorized", async () => {
      process.env.CRON_SECRET = "super-secret-token";

      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: { aged_out_count: 3 },
          error: null,
        }),
      };
      createAdminClientMock.mockReturnValue(
        mockSupabase as unknown as ReturnType<typeof createAdminClient>,
      );

      const req = new NextRequest("http://localhost:3000/api/cron/age-out", {
        method: "POST",
        headers: { authorization: "Bearer super-secret-token" },
      });

      const response = await POST(req);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.result).toEqual({ aged_out_count: 3 });
      expect(mockSupabase.rpc).toHaveBeenCalledWith("process_child_age_out");
    });

    it("returns 500 when RPC returns error", async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database timeout" },
        }),
      };
      createAdminClientMock.mockReturnValue(
        mockSupabase as unknown as ReturnType<typeof createAdminClient>,
      );

      const req = new NextRequest("http://localhost:3000/api/cron/age-out");

      const response = await GET(req);
      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toContain("Database timeout");
    });
  });

  describe("History Continuity: loadTourRegistrationOverview", () => {
    it("includes childhood tours in the 'Ich' tab for users with claimed child profiles", async () => {
      const orQueries: string[] = [];

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "child_profiles") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: [{ id: "claimed-child-10" }],
                  error: null,
                }),
              })),
            };
          }
          if (table === "tour_participants") {
            return {
              select: vi.fn(() => ({
                order: vi.fn(() => ({
                  or: vi.fn((condition: string) => {
                    orQueries.push(condition);
                    return Promise.resolve({
                      data: [
                        {
                          id: "tp-past-childhood",
                          tour_id: "tour-1",
                          status: "confirmed",
                          waitlist_position: null,
                          child_profile_id: "claimed-child-10",
                          tours: {
                            id: "tour-1",
                            title: "Jugendlager 2020",
                            status: "completed",
                            start_date: "2020-08-01",
                            end_date: "2020-08-05",
                            target_area: "Alpen",
                            max_participants: 12,
                            difficulty: "easy",
                          },
                        },
                      ],
                      error: null,
                    });
                  }),
                })),
              })),
            };
          }
          return {};
        }),
      } as unknown as Parameters<typeof loadTourRegistrationOverview>[0];

      const overview = await loadTourRegistrationOverview(
        mockSupabase,
        "adult-user-id",
        false, // not a parent
      );

      expect(overview.tabs.length).toBe(1);
      expect(overview.tabs[0].id).toBe("self");
      expect(overview.tabs[0].registrations.length).toBe(1);
      expect(overview.tabs[0].registrations[0].tour.title).toBe(
        "Jugendlager 2020",
      );
      expect(orQueries[0]).toContain("child_profile_id.in.(claimed-child-10)");
    });

    it("filters out aged out children from parent overview tabs", async () => {
      let filteredByIsActive = false;

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "child_profiles") {
            return {
              select: vi.fn((cols: string) => {
                if (cols === "id") {
                  // User's own claimed childhood profiles
                  return {
                    eq: vi.fn().mockResolvedValue({ data: [], error: null }),
                  };
                }
                // Parent's children
                return {
                  eq: vi.fn((_col1: string, _val1: string) => ({
                    eq: vi.fn((col2: string, val2: unknown) => {
                      if (col2 === "is_active" && val2 === true) {
                        filteredByIsActive = true;
                      }
                      return {
                        order: vi.fn().mockResolvedValue({
                          data: [{ id: "active-child-1", full_name: "Lukas" }],
                          error: null,
                        }),
                      };
                    }),
                  })),
                };
              }),
            };
          }
          if (table === "tour_participants") {
            return {
              select: vi.fn(() => ({
                order: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    is: vi.fn().mockResolvedValue({ data: [], error: null }),
                  })),
                })),
                in: vi.fn(() => ({
                  order: vi.fn().mockResolvedValue({ data: [], error: null }),
                })),
              })),
            };
          }
          return {};
        }),
      } as unknown as Parameters<typeof loadTourRegistrationOverview>[0];

      const overview = await loadTourRegistrationOverview(
        mockSupabase,
        "parent-id",
        true, // isParent
      );

      expect(filteredByIsActive).toBe(true);
      expect(overview.tabs.some((t) => t.id === "child-active-child-1")).toBe(
        true,
      );
    });
  });
});
