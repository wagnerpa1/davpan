import { differenceInYears, parseISO } from "date-fns";

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
