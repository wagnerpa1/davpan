import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAuth } from "@/app/actions/auth-guards";
import {
  linkChildByMemberNumber,
  unlinkChild,
} from "@/app/actions/child-profiles";
import { createAdminClient } from "@/utils/supabase/admin";

vi.mock("@/app/actions/auth-guards", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("child-profiles actions: linkChildByMemberNumber", () => {
  const requireAuthMock = vi.mocked(requireAuth);
  const createAdminClientMock = vi.mocked(createAdminClient);

  const mockUser = {
    id: "parent-user-id",
    email: "parent@example.com",
  };

  let mockAdminClient: unknown;
  let rpcCalls: Array<{ name: string; params: unknown }> = [];

  beforeEach(() => {
    vi.clearAllMocks();
    rpcCalls = [];

    requireAuthMock.mockResolvedValue({
      user: mockUser as unknown as Parameters<typeof requireAuthMock>[0],
      profile: {
        id: mockUser.id,
        email: mockUser.email,
        membership_number: "209-00-999999",
      } as unknown as Parameters<typeof requireAuthMock>[1],
      supabase: {} as unknown as Parameters<typeof requireAuthMock>[2],
    });

    mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { membership_number: "209-00-999999" },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === "section_members") {
          return {
            select: vi.fn(() => ({
              or: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      membership_number: "209-00-001234",
                      first_name: "Tim",
                      last_name: "Musterkind",
                      birthdate: "2015-05-10",
                      is_active: true,
                    },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        if (table === "child_profiles") {
          return {
            select: vi.fn(() => ({
              or: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null, // by default not existing yet
                  error: null,
                }),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: "child-new-id" },
                  error: null,
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
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
                    data: null, // not linked yet
                    error: null,
                  }),
                })),
              })),
            })),
            insert: vi.fn().mockResolvedValue({ error: null }),
            delete: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
              })),
            })),
          };
        }
        return {};
      }),
      rpc: vi.fn(async (name: string, params: unknown) => {
        rpcCalls.push({ name, params });
        return { data: null, error: null };
      }),
    };

    createAdminClientMock.mockReturnValue(
      mockAdminClient as unknown as ReturnType<typeof createAdminClient>,
    );
  });

  it("rejects membership number with invalid format", async () => {
    const result = await linkChildByMemberNumber({
      memberNumber: "123",
      birthdate: "2015-05-10",
    });

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("11 Ziffern");
  });

  it("rejects when child is already 18 years old", async () => {
    const result = await linkChildByMemberNumber({
      memberNumber: "209-00-001234",
      birthdate: "2000-01-01",
    });

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("18 Jahren");
  });

  it("rejects when parent tries to link their own membership number", async () => {
    const result = await linkChildByMemberNumber({
      memberNumber: "209-00-999999",
      birthdate: "2015-05-10",
    });

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("eigene Mitgliedsnummer");
  });

  it("rejects when child member record is inactive", async () => {
    mockAdminClient.from = vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { membership_number: "209-00-999999" },
                error: null,
              }),
            })),
          })),
        };
      }
      if (table === "section_members") {
        return {
          select: vi.fn(() => ({
            or: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    membership_number: "209-00-001234",
                    first_name: "Tim",
                    last_name: "Musterkind",
                    birthdate: "2015-05-10",
                    is_active: false,
                  },
                  error: null,
                }),
              })),
            })),
          })),
        };
      }
      return {};
    });

    const result = await linkChildByMemberNumber({
      memberNumber: "209-00-001234",
      birthdate: "2015-05-10",
    });

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("inaktiv");
  });

  it("rejects when child is already linked to this parent", async () => {
    mockAdminClient.from = vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { membership_number: "209-00-999999" },
                error: null,
              }),
            })),
          })),
        };
      }
      if (table === "section_members") {
        return {
          select: vi.fn(() => ({
            or: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    membership_number: "209-00-001234",
                    first_name: "Tim",
                    last_name: "Musterkind",
                    birthdate: "2015-05-10",
                    is_active: true,
                  },
                  error: null,
                }),
              })),
            })),
          })),
        };
      }
      if (table === "child_profiles") {
        return {
          select: vi.fn(() => ({
            or: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: "existing-child-id" },
                error: null,
              }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
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
                  data: { child_id: "existing-child-id" }, // already exists!
                  error: null,
                }),
              })),
            })),
          })),
        };
      }
      return {};
    });

    const result = await linkChildByMemberNumber({
      memberNumber: "209-00-001234",
      birthdate: "2015-05-10",
    });

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain(
      "bereits mit deinem Konto verknüpft",
    );
  });

  it("successfully links child, creates profile, and triggers parent status recalculation", async () => {
    const result = await linkChildByMemberNumber({
      memberNumber: "209-00-001234",
      birthdate: "2015-05-10",
    });

    expect(result.success).toBe(true);
    expect(result.data?.child.full_name).toBe("Tim Musterkind");
    expect(result.data?.child.id).toBe("child-new-id");

    expect(rpcCalls).toContainEqual({
      name: "recalculate_user_parent_status",
      params: { p_user_id: "parent-user-id" },
    });
  });

  it("successfully unlinks child and recalculates parent status", async () => {
    const result = await unlinkChild("child-new-id");

    expect(result.success).toBe(true);
    expect(rpcCalls).toContainEqual({
      name: "recalculate_user_parent_status",
      params: { p_user_id: "parent-user-id" },
    });
  });
});
