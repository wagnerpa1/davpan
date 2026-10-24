import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Initializes a new user profile upon successful auth callback confirmation.
 * Runs in a server-only context using admin credentials when available.
 */
export async function initializeUserProfileOnAuth(
  supabase: SupabaseClient,
  user: User,
): Promise<void> {
  const adminClient = (createAdminClient() ??
    supabase) as unknown as SupabaseClient;

  // Only initialize profile for new users; avoid overwriting existing profile/role/activation during password recovery
  const { data: existingProfile } = await adminClient
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile) {
    return;
  }

  const metadata = user.user_metadata || {};
  const fullName =
    typeof metadata.full_name === "string" ? metadata.full_name : null;
  const birthdate =
    typeof metadata.birthdate === "string" ? metadata.birthdate : null;
  const membershipNumber =
    typeof metadata.membership_number === "string"
      ? metadata.membership_number
      : null;
  const role = metadata.role === "guest" ? "guest" : "member";
  const requiresParentalApproval = metadata.requires_parental_approval === true;

  const { error: insertError } = await adminClient.from("profiles").insert({
    id: user.id,
    full_name: fullName,
    role,
    birthdate,
    membership_number: membershipNumber,
    requires_parental_approval: requiresParentalApproval,
    is_parent: false,
    is_activated: true,
    activated: true,
  });

  if (insertError) {
    console.error(
      "Error inserting initial user profile in auth callback:",
      insertError,
    );
    return;
  }

  if (membershipNumber) {
    const { error: claimError } = await adminClient.rpc(
      "claim_child_history_on_registration",
      {
        p_user_id: user.id,
        p_membership_number: membershipNumber,
      },
    );
    if (claimError) {
      console.error(
        "Error claiming child history on registration:",
        claimError,
      );
    }
  }
}
