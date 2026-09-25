"use server";

import type { User } from "@supabase/supabase-js";
import { cache } from "react";
import type { AppUserRole } from "@/lib/permissions";
import { createClient } from "@/utils/supabase/server";

interface CurrentUserProfile {
  birthdate: string | null;
  fullName: string | null;
  membershipNumber: string | null;
  role: AppUserRole | null;
  isParent: boolean;
  requiresParentalApproval: boolean;
  user: User | null;
}

export const getCurrentUserProfile = cache(
  async (): Promise<CurrentUserProfile> => {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        birthdate: null,
        fullName: null,
        membershipNumber: null,
        role: null,
        isParent: false,
        requiresParentalApproval: false,
        user: null,
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "birthdate, full_name, role, membership_number, activated, is_parent, requires_parental_approval",
      )
      .eq("id", user.id)
      .maybeSingle();

    const isParent = profile?.is_parent === true || profile?.role === "parent";
    const requiresParentalApproval =
      profile?.requires_parental_approval === true;

    return {
      birthdate: profile?.birthdate ?? null,
      fullName: profile?.full_name ?? null,
      membershipNumber: profile?.membership_number ?? null,
      role: (profile?.role as AppUserRole | null) ?? null,
      isParent,
      requiresParentalApproval,
      user,
    };
  },
);
