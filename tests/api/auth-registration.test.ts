import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  registerGuestAccount,
  registerMemberAccount,
} from "@/app/actions/auth-registration";
import {
  calculateAge,
  normalizeMembershipNumber,
} from "@/lib/membership-utils";

const { createClientMock, createAdminClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: createAdminClientMock,
}));

describe("auth-registration logic", () => {
  describe("calculateAge", () => {
    const referenceDate = new Date("2026-09-24T12:00:00Z");

    it("calculates age correctly for adult", () => {
      expect(calculateAge("2000-01-01", referenceDate)).toBe(26);
    });

    it("calculates exact 16th birthday", () => {
      expect(calculateAge("2010-09-24", referenceDate)).toBe(16);
    });

    it("returns 15 the day before the 16th birthday", () => {
      expect(calculateAge("2010-09-25", referenceDate)).toBe(15);
    });

    it("calculates exact 18th birthday", () => {
      expect(calculateAge("2008-09-24", referenceDate)).toBe(18);
    });

    it("returns 17 the day before the 18th birthday", () => {
      expect(calculateAge("2008-09-25", referenceDate)).toBe(17);
    });

    it("returns 0 for invalid date", () => {
      expect(calculateAge("invalid-date", referenceDate)).toBe(0);
    });
  });

  describe("normalizeMembershipNumber", () => {
    it("formats 11 digit membership numbers correctly", () => {
      const res = normalizeMembershipNumber("209-00-001234");
      expect(res.digits).toBe("20900001234");
      expect(res.formatted).toBe("209-00-001234");
    });

    it("normalizes unformatted 11 digits string", () => {
      const res = normalizeMembershipNumber("20900001234");
      expect(res.digits).toBe("20900001234");
      expect(res.formatted).toBe("209-00-001234");
    });
  });

  describe("registerMemberAccount (Flow A)", () => {
    let mockSupabase: unknown;
    let mockAdminClient: unknown;

    beforeEach(() => {
      mockSupabase = {
        auth: {
          signUp: vi.fn().mockResolvedValue({
            data: { user: { id: "user-123" } },
            error: null,
          }),
        },
      };

      mockAdminClient = {
        from: vi.fn((table: string) => {
          if (table === "profiles") {
            return {
              select: vi.fn(() => ({
                or: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null, // not already registered
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
                        first_name: "Max",
                        last_name: "Mustermann",
                        birthdate: "2000-01-01",
                        is_active: true,
                      },
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

      createClientMock.mockResolvedValue(
        mockSupabase as unknown as Awaited<ReturnType<typeof createClientMock>>,
      );
      createAdminClientMock.mockReturnValue(
        mockAdminClient as unknown as ReturnType<typeof createAdminClientMock>,
      );
    });

    it("rejects membership number with invalid length", async () => {
      const result = await registerMemberAccount({
        membershipNumber: "12345",
        birthdate: "2000-01-01",
        email: "max@example.com",
        password: "Password123!",
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("11 Ziffern");
    });

    it("rejects members younger than 16 with clear notification", async () => {
      const result = await registerMemberAccount({
        membershipNumber: "209-00-001234",
        birthdate: "2015-05-10",
        email: "child@example.com",
        password: "Password123!",
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("unter 16 Jahren");
    });

    it("registers 16-17 youth account with requiresParentalApproval = true", async () => {
      mockAdminClient.from = vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn(() => ({
              or: vi.fn(() => ({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: null, error: null }),
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
                      first_name: "Felix",
                      last_name: "Jugend",
                      birthdate: "2009-10-15",
                      is_active: true,
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

      const result = await registerMemberAccount({
        membershipNumber: "209-00-001234",
        birthdate: "2009-10-15",
        email: "felix@example.com",
        password: "Password123!",
      });

      expect(result.success).toBe(true);
      expect(result.data?.requiresParentalApproval).toBe(true);
      expect(result.data?.fullName).toBe("Felix Jugend");
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            data: expect.objectContaining({
              role: "member",
              requires_parental_approval: true,
              full_name: "Felix Jugend",
            }),
          }),
        }),
      );
    });

    it("registers adult member with requiresParentalApproval = false", async () => {
      const result = await registerMemberAccount({
        membershipNumber: "209-00-001234",
        birthdate: "2000-01-01",
        email: "adult@example.com",
        password: "Password123!",
      });

      expect(result.success).toBe(true);
      expect(result.data?.requiresParentalApproval).toBe(false);
      expect(result.data?.fullName).toBe("Max Mustermann");
    });

    it("rejects when section member is inactive", async () => {
      mockAdminClient.from = vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn(() => ({
              or: vi.fn(() => ({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: null, error: null }),
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
                      first_name: "Inaktiv",
                      last_name: "Mitglied",
                      birthdate: "2000-01-01",
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

      const result = await registerMemberAccount({
        membershipNumber: "209-00-001234",
        birthdate: "2000-01-01",
        email: "inactive@example.com",
        password: "Password123!",
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("inaktiv");
    });

    it("rejects duplicate registration when membership number is already registered", async () => {
      mockAdminClient.from = vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn(() => ({
              or: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: "existing-user-id" },
                  error: null,
                }),
              })),
            })),
          };
        }
        return {};
      });

      const result = await registerMemberAccount({
        membershipNumber: "209-00-001234",
        birthdate: "2000-01-01",
        email: "duplicate@example.com",
        password: "Password123!",
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("bereits mit einem Konto");
    });
  });

  describe("registerGuestAccount (Flow B)", () => {
    let mockSupabase: unknown;

    beforeEach(() => {
      mockSupabase = {
        auth: {
          signUp: vi.fn().mockResolvedValue({
            data: { user: { id: "guest-123" } },
            error: null,
          }),
        },
      };
      createClientMock.mockResolvedValue(
        mockSupabase as unknown as Awaited<ReturnType<typeof createClientMock>>,
      );
    });

    it("registers guest with valid name and password", async () => {
      const result = await registerGuestAccount({
        fullName: "Erika Gast",
        birthdate: "1990-05-15",
        email: "erika@example.com",
        password: "Password123!",
      });

      expect(result.success).toBe(true);
      expect(result.data?.fullName).toBe("Erika Gast");
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            data: expect.objectContaining({
              role: "guest",
              full_name: "Erika Gast",
              membership_number: null,
            }),
          }),
        }),
      );
    });

    it("rejects guest under 16 years old", async () => {
      const result = await registerGuestAccount({
        fullName: "Zu Jung",
        birthdate: "2015-01-01",
        email: "jung@example.com",
        password: "Password123!",
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("unter 16 Jahren");
    });
  });
});
