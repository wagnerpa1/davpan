"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { runAction } from "@/lib/action-runner";
import { getAuthCallbackUrl } from "@/lib/auth-client";
import { DomainError } from "@/lib/errors";
import {
  calculateAge,
  normalizeMembershipNumber,
} from "@/lib/membership-utils";
import { validatePassword } from "@/lib/password-rules";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export interface RegisterMemberInput {
  membershipNumber: string;
  birthdate: string;
  email: string;
  password: string;
}

export interface RegisterGuestInput {
  fullName: string;
  birthdate?: string | null;
  email: string;
  password: string;
}

/**
 * Validates email format.
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Flow A: Register a DAV Pfarrkirchen section member using their membership number and birthdate.
 * The full name is retrieved from the section member database.
 */
export async function registerMemberAccount(input: RegisterMemberInput) {
  return runAction(async () => {
    const rawNumber = input.membershipNumber.trim();
    const { digits, formatted } = normalizeMembershipNumber(rawNumber);

    if (digits.length !== 11) {
      throw new DomainError(
        "invalid_state",
        "Die Mitgliedsnummer muss 11 Ziffern haben (Format: 209-00-001234).",
      );
    }

    const birthdate = input.birthdate.trim();
    if (!birthdate) {
      throw new DomainError("invalid_state", "Bitte gib dein Geburtsdatum an.");
    }

    const email = input.email.trim().toLowerCase();
    if (!isValidEmail(email)) {
      throw new DomainError(
        "invalid_state",
        "Bitte gib eine gültige E-Mail-Adresse an.",
      );
    }

    const passwordValidation = validatePassword(input.password);
    if (!passwordValidation.valid) {
      throw new DomainError(
        "invalid_state",
        passwordValidation.errors[0] ??
          "Das Passwort erfüllt nicht die Sicherheitsrichtlinien.",
      );
    }

    const age = calculateAge(birthdate);
    if (age < 16) {
      throw new DomainError(
        "invalid_state",
        "Mitglieder unter 16 Jahren können kein eigenständiges Konto anlegen. Die Verwaltung erfolgt über das Elternkonto.",
      );
    }

    const requiresParentalApproval = age >= 16 && age < 18;

    const supabase = await createClient();
    const adminClient: SupabaseClient = (createAdminClient() ??
      supabase) as unknown as SupabaseClient;

    // Check if membership number is already registered to a profile
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .or(
        `membership_number.eq.${digits},membership_number.eq.${formatted},membership_number.eq.${rawNumber}`,
      )
      .maybeSingle();

    if (existingProfile) {
      throw new DomainError(
        "conflict",
        "Diese Mitgliedsnummer ist bereits mit einem Konto registriert. Bitte melde dich an.",
      );
    }

    // Query official section member database
    const { data: memberRecord, error: memberError } = await adminClient
      .from("section_members")
      .select("membership_number, first_name, last_name, birthdate, is_active")
      .or(
        `membership_number.eq.${digits},membership_number.eq.${formatted},membership_number.eq.${rawNumber}`,
      )
      .eq("birthdate", birthdate)
      .maybeSingle();

    if (memberError || !memberRecord) {
      throw new DomainError(
        "invalid_state",
        "Mitgliedsdaten nicht gefunden oder Geburtsdatum stimmt nicht überein. Bitte überprüfe deine Angaben.",
      );
    }

    if (!memberRecord.is_active) {
      throw new DomainError(
        "invalid_state",
        "Die Mitgliedschaft ist laut Mitgliederdatenbank derzeit inaktiv.",
      );
    }

    const fullName =
      `${memberRecord.first_name} ${memberRecord.last_name}`.trim();

    // Register user with Supabase Auth
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        data: {
          full_name: fullName,
          role: "member",
          birthdate,
          membership_number: memberRecord.membership_number,
          requires_parental_approval: requiresParentalApproval,
          is_parent: false,
        },
        emailRedirectTo: getAuthCallbackUrl(),
      },
    });

    if (signUpError) {
      console.error("SignUp error in registerMemberAccount:", signUpError);
      throw new DomainError(
        "invalid_state",
        signUpError.message || "Fehler bei der Registrierung.",
      );
    }

    return {
      success: true,
      email,
      fullName,
      requiresParentalApproval,
    };
  });
}

/**
 * Flow B: Register a guest / non-member / parent account.
 */
export async function registerGuestAccount(input: RegisterGuestInput) {
  return runAction(async () => {
    const fullName = input.fullName.trim();
    if (fullName.length < 2) {
      throw new DomainError(
        "invalid_state",
        "Bitte gib deinen vollständigen Namen an.",
      );
    }

    const email = input.email.trim().toLowerCase();
    if (!isValidEmail(email)) {
      throw new DomainError(
        "invalid_state",
        "Bitte gib eine gültige E-Mail-Adresse an.",
      );
    }

    const passwordValidation = validatePassword(input.password);
    if (!passwordValidation.valid) {
      throw new DomainError(
        "invalid_state",
        passwordValidation.errors[0] ??
          "Das Passwort erfüllt nicht die Sicherheitsrichtlinien.",
      );
    }

    const birthdate = input.birthdate ? input.birthdate.trim() : null;
    if (birthdate) {
      const age = calculateAge(birthdate);
      if (age < 16) {
        throw new DomainError(
          "invalid_state",
          "Personen unter 16 Jahren können kein eigenständiges Konto anlegen.",
        );
      }
    }

    const supabase = await createClient();

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        data: {
          full_name: fullName,
          role: "guest",
          birthdate,
          membership_number: null,
          requires_parental_approval: false,
          is_parent: false,
        },
        emailRedirectTo: getAuthCallbackUrl(),
      },
    });

    if (signUpError) {
      console.error("SignUp error in registerGuestAccount:", signUpError);
      throw new DomainError(
        "invalid_state",
        signUpError.message || "Fehler bei der Registrierung.",
      );
    }

    return {
      success: true,
      email,
      fullName,
    };
  });
}
