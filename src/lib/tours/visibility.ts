const DEFAULT_CUTOFF = "12-01";

function getVisibilityCutoffMonthDay(): { month: number; day: number } {
  const rawValue = process.env.TOUR_VISIBILITY_NEXT_YEAR_UNLOCK_AT;
  const normalized = (rawValue || DEFAULT_CUTOFF).trim();
  const match = /^(\d{2})-(\d{2})$/.exec(normalized);

  if (!match) {
    return { month: 12, day: 1 };
  }

  const month = Number.parseInt(match[1], 10);
  const day = Number.parseInt(match[2], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { month: 12, day: 1 };
  }

  return { month, day };
}

export function getTourVisibilityDateLimit(currentDate: Date): string {
  const currentYear = currentDate.getUTCFullYear();
  const currentMonth = currentDate.getUTCMonth() + 1;
  const currentDay = currentDate.getUTCDate();
  const cutoff = getVisibilityCutoffMonthDay();

  const isAfterOrOnCutoff =
    currentMonth > cutoff.month ||
    (currentMonth === cutoff.month && currentDay >= cutoff.day);

  if (isAfterOrOnCutoff) {
    return `${currentYear + 2}-01-01`;
  }

  return `${currentYear + 1}-01-01`;
}

export function shouldApplyTourVisibilityLimit(role: string | null): boolean {
  return role !== "admin" && role !== "guide";
}
