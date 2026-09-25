import type { SupabaseClient, User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAuth } from "@/app/actions/auth-guards";
import { approveYouthAccount } from "@/app/actions/child-profiles";
import { registerForTour } from "@/app/actions/tour-registration";
import * as dispatcher from "@/lib/notifications/dispatcher";
import {
  findLinkedParentUserIds,
  notifyParentOfYouthApprovalNeeded,
} from "@/lib/notifications/parental-approval-dispatch";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import type { Profile } from "@/utils/supabase/types";

vi.mock("@/app/actions/auth-guards", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/notifications/dispatcher", () => ({
  dispatchNotification: vi.fn().mockResolvedValue(true),
}));

describe("Youth Approval & Parental Notifications", () => {
  const requireAuthMock = vi.mocked(requireAuth);
  const createClientMock = vi.mocked(createClient);
  const createAdminClientMock = vi.mocked(createAdminClient);
  const dispatchNotificationMock = vi.mocked(dispatcher.dispatchNotification);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("parental-approval-dispatch helpers", () => {
    it("finds linked parent user IDs from both child_profiles and parent_child_relations", async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "child_profiles") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    { id: "child-rec-1", parent_id: "parent-1" },
                    { id: "child-rec-2", parent_id: null },
                  ],
                  error: null,
                }),
              })),
            };
          }
          if (table === "parent_child_relations") {
            return {
              select: vi.fn(() => ({
                in: vi.fn().mockResolvedValue({
                  data: [{ parent_id: "parent-2" }, { parent_id: "parent-1" }],
                  error: null,
                }),
              })),
            };
          }
          return {};
        }),
      } as unknown as SupabaseClient;

      const parentIds = await findLinkedParentUserIds(
        mockSupabase,
        "youth-user-id",
      );

      expect(parentIds).toContain("parent-1");
      expect(parentIds).toContain("parent-2");
      expect(parentIds.length).toBe(2);
    });

    it("dispatches notifications to all linked parents when approval is needed", async () => {
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "child_profiles") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: [{ id: "child-rec-1", parent_id: "parent-1" }],
                  error: null,
                }),
              })),
            };
          }
          if (table === "parent_child_relations") {
            return {
              select: vi.fn(() => ({
                in: vi.fn().mockResolvedValue({
                  data: [{ parent_id: "parent-1" }],
                  error: null,
                }),
              })),
            };
          }
          if (table === "profiles") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { full_name: "Timmy Berg" },
                    error: null,
                  }),
                })),
              })),
            };
          }
          return {};
        }),
      } as unknown as SupabaseClient;

      await notifyParentOfYouthApprovalNeeded(
        mockSupabase,
        "youth-user-id",
        "Klettersteig Tour",
      );

      expect(dispatchNotificationMock).toHaveBeenCalledTimes(1);
      expect(dispatchNotificationMock).toHaveBeenCalledWith(
        mockSupabase,
        expect.objectContaining({
          recipientUserId: "parent-1",
          title: "Elterliche Zustimmung erforderlich",
          body: expect.stringContaining(
            'Timmy Berg (16–17 Jahre) möchte an "Klettersteig Tour" teilnehmen',
          ),
        }),
      );
    });
  });

  describe("approveYouthAccount", () => {
    it("rejects when caller is not a linked parent", async () => {
      requireAuthMock.mockResolvedValue({
        user: { id: "unrelated-user" } as unknown as User,
        profile: {} as unknown as Profile,
        supabase: {} as unknown as SupabaseClient,
      });

      const mockAdmin = {
        from: vi.fn((table: string) => {
          if (table === "child_profiles") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: "child-1",
                      user_id: "youth-1",
                      parent_id: "other-parent",
                    },
                    error: null,
                  }),
                })),
              })),
            };
          }
          if (table === "parent_child_relations") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: null, // not in relations
                      error: null,
                    }),
                  })),
                })),
              })),
            };
          }
          return {};
        }),
      };
      createAdminClientMock.mockReturnValue(
        mockAdmin as unknown as ReturnType<typeof createAdminClient>,
      );

      const result = await approveYouthAccount("youth-1");

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("Keine Berechtigung");
    });

    it("approves youth account when caller is linked via parent_child_relations", async () => {
      requireAuthMock.mockResolvedValue({
        user: { id: "parent-user-id" } as unknown as User,
        profile: {} as unknown as Profile,
        supabase: {} as unknown as SupabaseClient,
      });

      let updatedProfile: {
        col: string;
        val: string;
        fields: {
          requires_parental_approval?: boolean;
          parental_approval_by?: string;
        };
      } | null = null;

      const mockAdmin = {
        from: vi.fn((table: string) => {
          if (table === "child_profiles") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: "child-1",
                      user_id: "youth-1",
                      parent_id: "another-parent-id",
                    },
                    error: null,
                  }),
                })),
              })),
            };
          }
          if (table === "parent_child_relations") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { parent_id: "parent-user-id" }, // caller found!
                      error: null,
                    }),
                  })),
                })),
              })),
            };
          }
          if (table === "profiles") {
            return {
              update: vi.fn(
                (fields: {
                  requires_parental_approval?: boolean;
                  parental_approval_by?: string;
                }) => ({
                  eq: vi.fn(async (col: string, val: string) => {
                    updatedProfile = { col, val, fields };
                    return { error: null };
                  }),
                }),
              ),
            };
          }
          return {};
        }),
      };
      createAdminClientMock.mockReturnValue(
        mockAdmin as unknown as ReturnType<typeof createAdminClient>,
      );

      const result = await approveYouthAccount("youth-1");

      expect(result.success).toBe(true);
      expect(updatedProfile).not.toBeNull();
      expect(updatedProfile.fields.requires_parental_approval).toBe(false);
      expect(updatedProfile.fields.parental_approval_by).toBe("parent-user-id");
    });
  });

  describe("registerForTour parental approval block", () => {
    it("blocks registration when youth requires parental approval", async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "youth-user-id", email: "youth@example.com" } },
            error: null,
          }),
        },
        from: vi.fn((table: string) => {
          if (table === "tours") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: "tour-100",
                      title: "Alpine Bergtour",
                      status: "open",
                      min_age: 16,
                      start_date: "2026-10-01",
                    },
                    error: null,
                  }),
                })),
              })),
            };
          }
          if (table === "profiles") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: "youth-user-id",
                      full_name: "Jugendlicher Bergsteiger",
                      birthdate: "2010-01-01",
                      requires_parental_approval: true, // Requires parental approval!
                    },
                    error: null,
                  }),
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { full_name: "Jugendlicher Bergsteiger" },
                    error: null,
                  }),
                })),
              })),
            };
          }
          if (table === "child_profiles") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: [{ id: "child-rec", parent_id: "parent-id" }],
                  error: null,
                }),
              })),
            };
          }
          if (table === "parent_child_relations") {
            return {
              select: vi.fn(() => ({
                in: vi.fn().mockResolvedValue({
                  data: [{ parent_id: "parent-id" }],
                  error: null,
                }),
              })),
            };
          }
          return {};
        }),
      };
      createClientMock.mockResolvedValue(
        mockSupabase as unknown as SupabaseClient,
      );

      const formData = new FormData();
      formData.append("tourId", "tour-100");

      const result = await registerForTour(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        "Zustimmung der Erziehungsberechtigten erforderlich",
      );
    });
  });
});
