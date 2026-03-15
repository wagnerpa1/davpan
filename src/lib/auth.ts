import type { User } from "@supabase/supabase-js";
import { cache } from "react";
import { createClient } from "@/utils/supabase/server";

interface CurrentUserProfile {
  birthdate: string | null;
  fullName: string | null;
  role: string | null;
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
        role: null,
        user: null,
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("birthdate, full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    return {
      birthdate: profile?.birthdate ?? null,
      fullName: profile?.full_name ?? null,
      role: profile?.role ?? null,
      user,
    };
  },
);
