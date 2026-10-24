"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { runAction } from "@/lib/action-runner";
import { DomainError } from "@/lib/errors";
import {
  calculateAge,
  normalizeMembershipNumber,
} from "@/lib/membership-utils";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAuth } from "./auth-guards";

export interface LinkChildInput {
  memberNumber: string;
  birthdate: string;
}

/**
 * Links a minor child to the authenticated user's account using the child's DAV membership number and birthdate.
 */
export async function linkChildByMemberNumber(input: LinkChildInput) {
  const auth = await requireAuth();
  return runAction(async () => {
    const rawNumber = input.memberNumber.trim();
    const { digits, formatted } = normalizeMembershipNumber(rawNumber);
    const birthdate = input.birthdate.trim();

    if (!digits || !birthdate) {
      throw new DomainError(
        "invalid_state",
        "Bitte gib Mitgliedsnummer und Geburtsdatum an.",
      );
    }

    if (digits.length !== 11) {
      throw new DomainError(
        "invalid_state",
        "Die Mitgliedsnummer muss 11 Ziffern haben (Format: 209-00-001234).",
      );
    }

    const age = calculateAge(birthdate);
    if (age >= 18) {
      throw new DomainError(
        "invalid_state",
        "Volljährige Mitglieder (ab 18 Jahren) können nicht als Kind verknüpft werden.",
      );
    }

    const adminClient: SupabaseClient = (createAdminClient() ??
      auth.supabase) as unknown as SupabaseClient;

    // Get current user profile to prevent self-linking
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("membership_number")
      .eq("id", auth.user.id)
      .single();

    if (
      callerProfile?.membership_number &&
      (callerProfile.membership_number === digits ||
        callerProfile.membership_number === formatted ||
        callerProfile.membership_number === rawNumber)
    ) {
      throw new DomainError(
        "invalid_state",
        "Du kannst deine eigene Mitgliedsnummer nicht als Kind verknüpfen.",
      );
    }

    // Query section_members
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
        "Mitgliedsdaten nicht gefunden oder Geburtsdatum stimmt nicht überein.",
      );
    }

    if (!memberRecord.is_active) {
      throw new DomainError(
        "invalid_state",
        "Die Mitgliedschaft des Kindes ist inaktiv.",
      );
    }

    const fullName =
      `${memberRecord.first_name} ${memberRecord.last_name}`.trim();

    // Check if child_profiles already exists with this membership_number
    let childId: string;
    const { data: existingChild } = await adminClient
      .from("child_profiles")
      .select("id")
      .or(
        `membership_number.eq.${digits},membership_number.eq.${formatted},membership_number.eq.${memberRecord.membership_number}`,
      )
      .maybeSingle();

    if (existingChild) {
      childId = existingChild.id;
      await adminClient
        .from("child_profiles")
        .update({
          full_name: fullName,
          birthdate,
          membership_number: memberRecord.membership_number,
          is_active: true,
        })
        .eq("id", childId);
    } else {
      const { data: newChild, error: createError } = await adminClient
        .from("child_profiles")
        .insert({
          parent_id: auth.user.id,
          full_name: fullName,
          birthdate,
          membership_number: memberRecord.membership_number,
          is_active: true,
        })
        .select("id")
        .single();

      if (createError || !newChild) {
        console.error("Error creating child profile:", createError);
        throw new DomainError(
          "unknown_error",
          "Kind-Profil konnte nicht erstellt werden.",
        );
      }
      childId = newChild.id;
    }

    // Check if already linked
    const { data: existingRelation } = await adminClient
      .from("parent_child_relations")
      .select("child_id")
      .eq("parent_id", auth.user.id)
      .eq("child_id", childId)
      .maybeSingle();

    if (existingRelation) {
      throw new DomainError(
        "conflict",
        "Dieses Kind ist bereits mit deinem Konto verknüpft.",
      );
    }

    const { error: relationError } = await adminClient
      .from("parent_child_relations")
      .insert({
        parent_id: auth.user.id,
        child_id: childId,
      });

    if (relationError) {
      console.error("Error inserting parent_child_relation:", relationError);
      throw new DomainError(
        "unknown_error",
        "Verknüpfung konnte nicht gespeichert werden.",
      );
    }

    // Trigger recalculation of parent status
    await adminClient.rpc("recalculate_user_parent_status", {
      p_user_id: auth.user.id,
    });

    revalidatePath("/profile");
    return {
      success: true,
      child: {
        id: childId,
        full_name: fullName,
        birthdate,
        membership_number: memberRecord.membership_number,
      },
    };
  });
}

/**
 * Approves a linked youth account (ages 16-17) so they can register for tours independently.
 */
export async function approveYouthAccount(youthProfileId: string) {
  const auth = await requireAuth();
  return runAction(async () => {
    const adminClient: SupabaseClient = (createAdminClient() ??
      auth.supabase) as unknown as SupabaseClient;

    // Verify caller is a linked parent of this youth
    const { data: linkedChild } = await adminClient
      .from("child_profiles")
      .select("id, user_id, parent_id")
      .eq("user_id", youthProfileId)
      .maybeSingle();

    let isAuthorized = false;
    if (linkedChild) {
      if (linkedChild.parent_id === auth.user.id) {
        isAuthorized = true;
      } else {
        const { data: relation } = await adminClient
          .from("parent_child_relations")
          .select("parent_id")
          .eq("parent_id", auth.user.id)
          .eq("child_id", linkedChild.id)
          .maybeSingle();
        if (relation) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      throw new DomainError(
        "unauthorized",
        "Keine Berechtigung zur Freigabe dieses Kontos.",
      );
    }

    const { error: updateError } = await adminClient
      .from("profiles")
      .update({
        requires_parental_approval: false,
        parental_approval_by: auth.user.id,
        parental_approval_at: new Date().toISOString(),
      })
      .eq("id", youthProfileId);

    if (updateError) {
      console.error("Error approving youth account:", updateError);
      throw new DomainError(
        "unknown_error",
        "Freigabe konnte nicht erteilt werden.",
      );
    }

    revalidatePath("/profile");
    return { success: true };
  });
}

/**
 * Unlinks a child from the parent's account.
 */
export async function unlinkChild(childId: string) {
  const auth = await requireAuth();
  return runAction(async () => {
    const adminClient: SupabaseClient = (createAdminClient() ??
      auth.supabase) as unknown as SupabaseClient;

    await adminClient
      .from("parent_child_relations")
      .delete()
      .eq("parent_id", auth.user.id)
      .eq("child_id", childId);

    // If parent_id on child_profiles is also caller, clear it
    await adminClient
      .from("child_profiles")
      .update({ parent_id: null })
      .eq("id", childId)
      .eq("parent_id", auth.user.id);

    await adminClient.rpc("recalculate_user_parent_status", {
      p_user_id: auth.user.id,
    });

    revalidatePath("/profile");
    return { success: true };
  });
}
