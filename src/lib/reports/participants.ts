import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/types";

type ParticipantsClient = SupabaseClient<Database>;

interface RawParticipant {
  id: string;
  status: string;
  user_id: string | null;
  child_profile_id: string | null;
  profiles:
    | {
        full_name: string | null;
        phone: string | null;
        emergency_phone: string | null;
        medical_notes: string | null;
        image_consent: boolean | null;
      }
    | Array<{
        full_name: string | null;
        phone: string | null;
        emergency_phone: string | null;
        medical_notes: string | null;
        image_consent: boolean | null;
      }>
    | null;
  child_profiles:
    | {
        full_name: string | null;
        medical_notes: string | null;
        image_consent: boolean | null;
      }
    | Array<{
        full_name: string | null;
        medical_notes: string | null;
        image_consent: boolean | null;
      }>
    | null;
}

export async function getTourParticipantsForListing(
  supabase: ParticipantsClient,
  tourId: string,
  userId: string,
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  const profileRole = (profile as { role?: string | null } | null)?.role;
  const isAdmin = profileRole === "admin";
  const { data: isGuide } = await supabase
    .from("tour_guides")
    .select("id")
    .eq("tour_id", tourId)
    .eq("user_id", userId)
    .single();

  if (!isAdmin && !isGuide) {
    return [];
  }

  const { data: participants } = await supabase
    .from("tour_participants")
    .select(`
      id,
      status,
      user_id,
      child_profile_id,
      profiles (
        full_name,
        phone,
        emergency_phone,
        medical_notes,
        image_consent
      ),
      child_profiles (
        full_name,
        medical_notes,
        image_consent
      )
    `)
    .eq("tour_id", tourId)
    .in("status", ["confirmed", "pending"]);

  return ((participants || []) as RawParticipant[]).map((p) => {
    const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    const childProfile = Array.isArray(p.child_profiles)
      ? p.child_profiles[0]
      : p.child_profiles;

    return {
      ...p,
      profiles: profile
        ? {
            ...profile,
            image_consent: profile.image_consent ?? false,
          }
        : null,
      child_profiles: childProfile
        ? {
            ...childProfile,
            image_consent: childProfile.image_consent ?? false,
          }
        : null,
    };
  });
}
