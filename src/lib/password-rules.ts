/**
 * Password validation and strength calculation rules.
 * Complies with NIST SP 800-63B and OWASP recommendations:
 * - Minimum 8 characters (10+ recommended)
 * - Maximum 72 characters (bcrypt limit safeguard)
 * - Presence of alphabetic characters and numbers/special characters
 * - Rejection of pure whitespace
 */

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export interface PasswordStrength {
  score: number; // 0 to 4
  label: string;
  colorClass: string;
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.trim().length === 0) {
    errors.push("Das Passwort darf nicht leer sein.");
    return { valid: false, errors };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(
      `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`,
    );
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    errors.push(
      `Das Passwort darf maximal ${MAX_PASSWORD_LENGTH} Zeichen lang sein.`,
    );
  }

  if (!/[a-zA-Z]/.test(password)) {
    errors.push("Das Passwort muss mindestens einen Buchstaben enthalten.");
  }

  if (!/[0-9\W_]/.test(password)) {
    errors.push(
      "Das Passwort muss mindestens eine Ziffer oder ein Sonderzeichen enthalten.",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: "Zu kurz", colorClass: "bg-slate-200" };
  }

  let score = 0;

  if (password.length >= MIN_PASSWORD_LENGTH) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password) && /[\W_]/.test(password)) score += 1;

  switch (score) {
    case 0:
    case 1:
      return { score: 1, label: "Schwach", colorClass: "bg-red-500" };
    case 2:
      return { score: 2, label: "Mittel", colorClass: "bg-amber-500" };
    case 3:
      return { score: 3, label: "Gut", colorClass: "bg-lime-600" };
    case 4:
      return { score: 4, label: "Sehr stark", colorClass: "bg-green-600" };
    default:
      return { score: 1, label: "Schwach", colorClass: "bg-red-500" };
  }
}
