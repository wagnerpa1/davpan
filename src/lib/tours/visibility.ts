const DEFAULT_CUTOFF = "12-01";

/**
 * Parses the cutoff date from environment variables.
 * Defaults to December 1st if missing or invalid.
 */
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

/**
 * Calculates the maximum visibility date for a normal user.
 * Tours starting after this date are hidden.
 * Typically hides tours of the next year until the cutoff date is reached.
 */
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

/**
 * Determines whether a user's role requires them to be restricted by the visibility limit.
 * Admins and Guides can see all tours regardless of the date.
 */
export function shouldApplyTourVisibilityLimit(role: string | null): boolean {
  return role !== "admin" && role !== "guide";
}
