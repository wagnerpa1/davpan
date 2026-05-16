"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/lib/action-runner";
import { DomainError } from "@/lib/errors";
import { createClient } from "@/utils/supabase/server";

export async function createChildProfileInvite(childId: string) {
  return runAction(async () => {
    const supabase = await createClient();
    const { data: userData, error: authError } = await supabase.auth.getUser();

    if (authError || !userData?.user) {
      throw new DomainError("unauthorized", "Nicht autorisiert");
    }

    // Verify parent is linked to the child
    const { data: hasLink, error: linkError } = await supabase
      .from("parent_child_relations")
      .select("child_id")
      .eq("parent_id", userData.user.id)
      .eq("child_id", childId)
      .single();

    let hasLegacyLink = false;

    // Fallback if relations table is missing or empty for this link
    if (linkError || !hasLink) {
      const { data: isLegacyParent } = await supabase
        .from("child_profiles")
        .select("id")
        .eq("parent_id", userData.user.id)
        .eq("id", childId)
        .single();

      if (!isLegacyParent) {
        throw new DomainError(
          "unauthorized",
          "Keine Berechtigung f�r dieses Kind",
        );
      }

      hasLegacyLink = true;
    }

    // Backfill relation row for legacy children so invite insert passes RLS.
    if (!hasLink && hasLegacyLink) {
      const { error: relationInsertError } = await supabase
        .from("parent_child_relations")
        .insert({
          parent_id: userData.user.id,
          child_id: childId,
        });

      if (
        relationInsertError &&
        relationInsertError.code !== "23505" // duplicate key
      ) {
        console.error(
          "Error syncing legacy parent-child relation:",
          relationInsertError,
        );
        throw new DomainError(
          "unknown_error",
          "Verknüpfung konnte nicht vorbereitet werden",
        );
      }
    }

    const { data: invite, error } = await supabase
      .from("child_profile_invites")
      .insert({
        child_id: childId,
        created_by: userData.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating invite:", error);
      throw new DomainError(
        "unknown_error",
        "Ein interner Fehler ist aufgetreten",
      );
    }

    revalidatePath("/profile");
    return { success: true, invite };
  });
}

export async function redeemChildProfileInvite(
  code: string,
  birthdate: string,
) {
  return runAction(async () => {
    const supabase = await createClient();
    const normalizedCode = code.trim();

    const uuidLikeRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidLikeRegex.test(normalizedCode)) {
      throw new DomainError("invalid_state", "Ungültiger Einladungscode.");
    }

    // RLS will normally block selecting an invite they didn't create,
    // but the RPC function `redeem_child_invite` runs with SECURITY DEFINER
    const { data, error } = await supabase.rpc("redeem_child_invite", {
      p_code: normalizedCode,
      p_birthdate: birthdate,
    });

    if (error) {
      console.error("Error redeeming code:", error);
      throw new DomainError(
        "unknown_error",
        "Ein interner Fehler ist aufgetreten",
      );
    }

    if (!data.success) {
      throw new DomainError(
        "invalid_state",
        data.error === "INVALID_CODE"
          ? "Ungültiger Einladungscode."
          : data.error === "EXPIRED_CODE"
            ? "Einladungscode ist abgelaufen."
            : data.error === "INVALID_BIRTHDATE"
              ? "Das angebene Geburtsdatum ist falsch."
              : "Unbekannter Fehler.",
      );
    }

    revalidatePath("/profile");
    return { success: true, message: data.message };
  });
}

export async function getActiveInvites(childId: string) {
  return runAction(async () => {
    const supabase = await createClient();
    const { data: invites, error } = await supabase
      .from("child_profile_invites")
      .select("*")
      .eq("child_id", childId);

    if (error) {
      throw new DomainError(
        "unknown_error",
        "Ein interner Fehler ist aufgetreten",
      );
    }

    return { success: true, invites };
  });
}
