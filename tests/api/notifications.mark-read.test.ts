import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/notifications/mark-read/route";

vi.mock("@/lib/security", () => ({
  isSameOriginRequest: vi.fn(() => true),
}));

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: createClientMock,
}));

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/notifications/mark-read", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/notifications/mark-read (RLS-nahe Szenarien)", () => {
  it("gibt 403 zurueck, wenn single-read nicht dem User/Kind gehoert", async () => {
    const supabaseMock = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-a" } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "notifications") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: "n1",
                    recipient_user_id: "user-b",
                    recipient_child_id: null,
                    read_at: null,
                  },
                  error: null,
                }),
              })),
            })),
          };
        }

        if (table === "child_profiles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                })),
              })),
            })),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    createClientMock.mockResolvedValueOnce(supabaseMock);

    const response = await POST(
      createRequest({ scope: "single", notificationId: "n1" }) as never,
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "Forbidden",
    });
  });

  it("markiert single-read erfolgreich fuer parent->child ownership", async () => {
    const updateCall = vi.fn(() => ({
      eq: vi.fn(() => ({
        is: vi.fn().mockResolvedValue({ error: null }),
      })),
    }));

    const supabaseMock = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "parent-1" } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "notifications") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: "n2",
                    recipient_user_id: null,
                    recipient_child_id: "child-1",
                    read_at: null,
                  },
                  error: null,
                }),
              })),
            })),
            update: updateCall,
          };
        }

        if (table === "child_profiles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi
                    .fn()
                    .mockResolvedValue({ data: { id: "child-1" } }),
                })),
              })),
            })),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    createClientMock.mockResolvedValueOnce(supabaseMock);

    const response = await POST(
      createRequest({ scope: "single", notificationId: "n2" }) as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true });
    expect(updateCall).toHaveBeenCalledTimes(1);
  });
});
