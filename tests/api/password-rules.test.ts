import { describe, expect, it } from "vitest";
import {
  getPasswordStrength,
  MIN_PASSWORD_LENGTH,
  validatePassword,
} from "@/lib/password-rules";

describe("Password Rules & Validation (NIST/OWASP compliance)", () => {
  it("rejects empty or whitespace-only passwords", () => {
    expect(validatePassword("").valid).toBe(false);
    expect(validatePassword("   ").valid).toBe(false);
  });

  it(`rejects passwords shorter than ${MIN_PASSWORD_LENGTH} characters`, () => {
    const result = validatePassword("Abc1!");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`,
    );
  });

  it("rejects passwords without any letters", () => {
    const result = validatePassword("1234567890!");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Das Passwort muss mindestens einen Buchstaben enthalten.",
    );
  });

  it("rejects passwords without numbers or special characters", () => {
    const result = validatePassword("abcdefghijk");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Das Passwort muss mindestens eine Ziffer oder ein Sonderzeichen enthalten.",
    );
  });

  it("accepts valid passwords with letters and numbers/symbols", () => {
    expect(validatePassword("SicheresBergPasswort2026").valid).toBe(true);
    expect(validatePassword("AlpenPasswort!").valid).toBe(true);
    expect(validatePassword("dav-pfarrkirchen-99").valid).toBe(true);
  });

  it("evaluates password strength accurately", () => {
    expect(getPasswordStrength("").score).toBe(0);
    expect(getPasswordStrength("kurz").score).toBe(1);
    expect(getPasswordStrength("langgenugmit1").score).toBe(2);
    expect(getPasswordStrength("LangGenugMit1").score).toBe(3);
    expect(getPasswordStrength("SehrStarkesPW!2026").score).toBe(4);
  });
});
