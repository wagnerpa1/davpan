/**
 * Calculates a person's age in full years based on their birthdate and a reference date.
 */
export function calculateAge(
  birthdateStr: string,
  referenceDate: Date = new Date(),
): number {
  const birth = new Date(birthdateStr);
  if (Number.isNaN(birth.getTime())) {
    return 0;
  }
  let age = referenceDate.getFullYear() - birth.getFullYear();
  const monthDiff = referenceDate.getMonth() - birth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && referenceDate.getDate() < birth.getDate())
  ) {
    age--;
  }
  return age;
}

/**
 * Strips non-digit characters and ensures basic membership number formatting.
 */
export function normalizeMembershipNumber(raw: string): {
  digits: string;
  formatted: string;
} {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) {
    return { digits, formatted: digits };
  }
  if (digits.length <= 5) {
    return { digits, formatted: `${digits.slice(0, 3)}-${digits.slice(3)}` };
  }
  return {
    digits,
    formatted: `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`,
  };
}
