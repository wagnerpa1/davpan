import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientSpy, dispatchNotificationSpy, revalidatePathSpy } =
  vi.hoisted(() => ({
    createClientSpy: vi.fn(),
    dispatchNotificationSpy: vi.fn(),
    revalidatePathSpy: vi.fn(),
  }));

vi.mock("@/utils/supabase/server", () => ({
  createClient: createClientSpy,
}));

vi.mock("@/lib/notifications/dispatcher", () => ({
  dispatchNotification: dispatchNotificationSpy,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathSpy,
}));

import { updateParticipantStatus } from "../../src/app/actions/participant-management";

type MockResponse = {
  data: unknown;
  error: { code?: string; message?: string } | null;
};

function createSupabaseMockForCancelWithFallback() {
  const rpcSpy = vi
    .fn<[string, Record<string, unknown>], Promise<MockResponse>>()
    .mockResolvedValueOnce({
      data: null,
      error: {
        code: "PGRST202",
        message:
          "Could not find the function public.apply_participant_status_transition_atomic(p_expected_status, p_idempotency_key, p_new_status, p_registration_id) in the schema cache",
      },
    })
    .mockResolvedValueOnce({
      data: { promoted_count: 0 },
      error: null,
    });

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "guide-1" } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { role: "guide" },
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === "tour_participants") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  tour_id: "tour-1",
                  user_id: "participant-1",
                  child_profile_id: null,
                  status: "pending",
                },
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === "tours") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { group: "group-1", title: "Testtour" },
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === "tour_guides") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: "tg-1" },
                  error: null,
                }),
              })),
            })),
          })),
        };
      }

      if (table === "material_reservations") {
        return {
          select: vi.fn(() => ({
            match: vi.fn(() => ({
              or: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
    rpc: rpcSpy,
  };

  return { supabase, rpcSpy };
}

describe("updateParticipantStatus RPC fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retries without p_idempotency_key when PostgREST schema cache has old function signature", async () => {
    const { supabase, rpcSpy } = createSupabaseMockForCancelWithFallback();
    createClientSpy.mockResolvedValue(supabase as never);

    const result = await updateParticipantStatus("reg-1", "cancelled");

    expect(result).toEqual({ success: true });
    expect(rpcSpy).toHaveBeenCalledTimes(2);

    const firstCallArgs = rpcSpy.mock.calls[0][1];
    const secondCallArgs = rpcSpy.mock.calls[1][1];

    expect(firstCallArgs).toHaveProperty("p_idempotency_key");
    expect(secondCallArgs).not.toHaveProperty("p_idempotency_key");

    expect(dispatchNotificationSpy).toHaveBeenCalledTimes(1);
    expect(revalidatePathSpy).toHaveBeenCalledWith("/touren/tour-1");
  });
});
