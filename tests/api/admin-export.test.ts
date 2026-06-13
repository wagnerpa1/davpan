import { afterEach, describe, expect, it, vi } from "vitest";

const { createClientMock, getCurrentUserProfileMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getCurrentUserProfileMock: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUserProfile: getCurrentUserProfileMock,
}));

import { GET } from "../../src/app/api/admin/export/route";

const originalDateTimeFormat = Intl.DateTimeFormat;

function installUtcDateTimeFormatMock() {
  const formatMock = vi.fn(
    (date: Date) => `formatted:${date.toISOString().slice(0, 10)}`,
  );
  const constructorMock = vi.fn(() => ({ format: formatMock }));

  (
    Intl as typeof Intl & { DateTimeFormat: typeof Intl.DateTimeFormat }
  ).DateTimeFormat = constructorMock as typeof Intl.DateTimeFormat;

  return { constructorMock, formatMock };
}

function createAdminProfileMock() {
  getCurrentUserProfileMock.mockResolvedValue({ role: "admin" });
}

function createToursSupabaseMock() {
  return {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn((table: string) => {
      if (table !== "tours") {
        throw new Error(`Unexpected table in tours export test: ${table}`);
      }

      return {
        select: vi.fn(() => ({
          gte: vi.fn(() => ({
            lt: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    title: "Sommerfahrt",
                    description: "Beschreibung",
                    start_date: "2026-06-13T00:00:00Z",
                    end_date: "2026-06-14T00:00:00Z",
                    difficulty: "mittel",
                    target_area: "Alpen",
                    requirements: "Kondition",
                    meeting_point: "Parkplatz",
                    meeting_time: "08:00",
                    elevation: 1200,
                    distance: 14,
                    duration_hours: 6,
                    cost_info: "12 EUR",
                    max_participants: 10,
                    min_age: 14,
                    status: "planung",
                    tour_groups: { group_name: "Jugend" },
                    tour_categorys: { category: "Bergtour" },
                    tour_guides: [{ profiles: { full_name: "Max Guide" } }],
                    tour_material_requirements: [
                      { material_types: { name: "Helm" } },
                    ],
                    resource_bookings: [{ resources: { name: "Bus" } }],
                  },
                ],
                error: null,
              }),
            })),
          })),
        })),
      };
    }),
  };
}

function createParticipantsSupabaseMock() {
  return {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn((table: string) => {
      if (table === "tours") {
        return {
          select: vi.fn(() => ({
            gte: vi.fn(() => ({
              lt: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({
                  data: [
                    { id: "tour-1", title: "Sommerfahrt", group: "group-1" },
                  ],
                  error: null,
                }),
              })),
            })),
          })),
        };
      }

      if (table === "tour_participants") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              in: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      status: "confirmed",
                      tour_id: "tour-1",
                      user_id: "user-1",
                      child_profile_id: null,
                      created_at: "2026-06-01T10:00:00Z",
                    },
                  ],
                  error: null,
                }),
              })),
            })),
          })),
        };
      }

      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() =>
              Promise.resolve({
                data: [
                  {
                    id: "user-1",
                    full_name: "Anna Mitglied",
                    birthdate: "2010-01-02T00:00:00Z",
                    membership_number: "M-42",
                  },
                ],
                error: null,
              }),
            ),
          })),
        };
      }

      if (table === "child_profiles") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        };
      }

      if (table === "tour_groups") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() =>
              Promise.resolve({
                data: [{ id: "group-1", group_name: "Familien" }],
                error: null,
              }),
            ),
          })),
        };
      }

      throw new Error(`Unexpected table in participant export test: ${table}`);
    }),
  };
}

function createRequest(type: string): Request {
  return new Request(`http://localhost/api/admin/export?type=${type}`);
}

afterEach(() => {
  Intl.DateTimeFormat = originalDateTimeFormat;
  vi.clearAllMocks();
});

describe("GET /api/admin/export", () => {
  it("returns a no-store CSV for tours and formats dates in UTC", async () => {
    createAdminProfileMock();
    const { constructorMock } = installUtcDateTimeFormatMock();
    createClientMock.mockResolvedValueOnce(createToursSupabaseMock());

    const response = await GET(createRequest("tours-current"));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "no-store, max-age=0, must-revalidate",
    );
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.headers.get("content-disposition")).toContain(
      "touren_geplant_2026.csv",
    );
    expect(constructorMock).toHaveBeenCalledWith("de-DE", {
      timeZone: "UTC",
    });
    expect(body).toContain("formatted:2026-06-13");
    expect(body).toContain("formatted:2026-06-14");
  });

  it("returns a no-store CSV for participants as well", async () => {
    createAdminProfileMock();
    const { constructorMock } = installUtcDateTimeFormatMock();
    createClientMock.mockResolvedValueOnce(createParticipantsSupabaseMock());

    const response = await GET(createRequest("participants-current"));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "no-store, max-age=0, must-revalidate",
    );
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.headers.get("content-disposition")).toContain(
      "teilnehmer_2026.csv",
    );
    expect(constructorMock).toHaveBeenCalledWith("de-DE", {
      timeZone: "UTC",
    });
    expect(body).toContain("Anna Mitglied");
    expect(body).toContain("formatted:2010-01-02");
  });
});
