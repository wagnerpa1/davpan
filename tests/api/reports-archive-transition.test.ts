import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, revalidatePathSpy } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  revalidatePathSpy: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathSpy,
}));

type Role = "admin" | "guide" | "member";

function createSupabaseMock(params?: { role?: Role; isGuide?: boolean }) {
  const role = params?.role ?? "guide";
  const isGuide = params?.isGuide ?? true;

  const toursUpdateNeq = vi.fn().mockResolvedValue({ error: null });
  const toursUpdateEq = vi.fn(() => ({ neq: toursUpdateNeq }));
  const toursUpdate = vi.fn(() => ({ eq: toursUpdateEq }));

  const reportsUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const reportsUpdate = vi.fn(() => ({ eq: reportsUpdateEq }));

  const reportsInsertSingle = vi
    .fn()
    .mockResolvedValue({ data: { id: "report-new" }, error: null });
  const reportsInsertSelect = vi.fn(() => ({ single: reportsInsertSingle }));
  const reportsInsert = vi.fn(() => ({ select: reportsInsertSelect }));

  const reportImagesInsert = vi.fn().mockResolvedValue({ error: null });

  const tourGuidesSingle = vi.fn().mockResolvedValue({
    data: isGuide ? { id: "guide-row" } : null,
    error: isGuide ? null : { message: "not found" },
  });
  const tourGuidesEqUser = vi.fn(() => ({ single: tourGuidesSingle }));
  const tourGuidesEqTour = vi.fn(() => ({ eq: tourGuidesEqUser }));

  const profilesSingle = vi.fn().mockResolvedValue({
    data: { role },
    error: null,
  });
  const profilesEq = vi.fn(() => ({ single: profilesSingle }));

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
      }),
    },
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({ eq: profilesEq })),
        };
      }

      if (table === "tour_guides") {
        return {
          select: vi.fn(() => ({ eq: tourGuidesEqTour })),
        };
      }

      if (table === "tour_reports") {
        return {
          update: reportsUpdate,
          insert: reportsInsert,
        };
      }

      if (table === "tours") {
        return {
          update: toursUpdate,
        };
      }

      if (table === "report_images") {
        return {
          insert: reportImagesInsert,
        };
      }

      throw new Error(`Unexpected table access in test: ${table}`);
    }),
  };

  return {
    supabase,
    toursUpdate,
    toursUpdateEq,
    toursUpdateNeq,
    reportsUpdate,
    reportsUpdateEq,
  };
}

function buildFormData(values: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) {
    fd.set(key, value);
  }
  return fd;
}

describe("upsertReport archive flow", () => {
  beforeEach(() => {
    createClientMock.mockReset();
    revalidatePathSpy.mockReset();
  });

  it("creates first report without mutating tour status", async () => {
    const mocks = createSupabaseMock({ role: "guide", isGuide: true });
    createClientMock.mockResolvedValue(mocks.supabase);

    const { upsertReport } = await import("@/app/actions/reports");

    const result = await upsertReport(
      buildFormData({
        tourId: "tour-1",
        title: "Tourbericht",
        text: "Alles super",
      }),
    );

    expect(result).toEqual({ success: true, id: "report-new" });
    expect(mocks.toursUpdate).not.toHaveBeenCalled();
    expect(mocks.toursUpdateEq).not.toHaveBeenCalled();
    expect(mocks.toursUpdateNeq).not.toHaveBeenCalled();
  });

  it("does not change tour status on report update", async () => {
    const mocks = createSupabaseMock({ role: "guide", isGuide: true });
    createClientMock.mockResolvedValue(mocks.supabase);

    const { upsertReport } = await import("@/app/actions/reports");

    const result = await upsertReport(
      buildFormData({
        tourId: "tour-1",
        reportId: "existing-report",
        title: "Aktualisierung",
        text: "Korrigierter Text",
      }),
    );

    expect(result).toEqual({ success: true, id: "existing-report" });
    expect(mocks.reportsUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.reportsUpdateEq).toHaveBeenCalledWith("id", "existing-report");
    expect(mocks.toursUpdate).not.toHaveBeenCalled();
  });
});
