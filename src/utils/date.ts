import { differenceInYears, format as formatDateFns, parseISO } from "date-fns";

/**
 * Calculates age based on a birthdate string (YYYY-MM-DD).
 */
export function calculateAge(birthdate?: string | null): number | null {
  if (!birthdate) return null;
  try {
    const birthDate = parseISO(birthdate);
    return differenceInYears(new Date(), birthDate);
  } catch (error) {
    console.error("Error calculating age:", error);
    return null;
  }
}

/**
 * Formats an ISO-like date string into DD.MM.YYYY.
 */
function formatDate(value?: string | null): string {
  if (!value) {
    return "";
  }

  try {
    return formatDateFns(parseISO(value), "dd.MM.yyyy");
  } catch {
    return "";
  }
}
