import { afterEach, describe, expect, it } from "vitest";
import {
  getTourVisibilityDateLimit,
  shouldApplyTourVisibilityLimit,
} from "@/lib/tours/visibility";

describe("tour visibility date limit", () => {
  const originalCutoff = process.env.TOUR_VISIBILITY_NEXT_YEAR_UNLOCK_AT;

  afterEach(() => {
    if (typeof originalCutoff === "undefined") {
      delete process.env.TOUR_VISIBILITY_NEXT_YEAR_UNLOCK_AT;
      return;
    }

    process.env.TOUR_VISIBILITY_NEXT_YEAR_UNLOCK_AT = originalCutoff;
  });

  it("returns next year cutoff for non-December", () => {
    const result = getTourVisibilityDateLimit(new Date("2026-11-15T10:00:00Z"));
    expect(result).toBe("2027-01-01");
  });

  it("returns year-after-next cutoff in December", () => {
    const result = getTourVisibilityDateLimit(new Date("2026-12-02T10:00:00Z"));
    expect(result).toBe("2028-01-01");
  });

  it("respects configured cutoff month-day from env", () => {
    process.env.TOUR_VISIBILITY_NEXT_YEAR_UNLOCK_AT = "10-15";

    const beforeCutoff = getTourVisibilityDateLimit(
      new Date("2026-10-14T10:00:00Z"),
    );
    const onCutoff = getTourVisibilityDateLimit(
      new Date("2026-10-15T10:00:00Z"),
    );

    expect(beforeCutoff).toBe("2027-01-01");
    expect(onCutoff).toBe("2028-01-01");
  });

  it("falls back to default cutoff when env value is invalid", () => {
    process.env.TOUR_VISIBILITY_NEXT_YEAR_UNLOCK_AT = "invalid";

    const result = getTourVisibilityDateLimit(new Date("2026-11-20T10:00:00Z"));
    expect(result).toBe("2027-01-01");
  });

  it("applies limit for members and parents", () => {
    expect(shouldApplyTourVisibilityLimit("member")).toBe(true);
    expect(shouldApplyTourVisibilityLimit("parent")).toBe(true);
    expect(shouldApplyTourVisibilityLimit(null)).toBe(true);
  });

  it("does not apply limit for guides and admins", () => {
    expect(shouldApplyTourVisibilityLimit("guide")).toBe(false);
    expect(shouldApplyTourVisibilityLimit("admin")).toBe(false);
  });
});
