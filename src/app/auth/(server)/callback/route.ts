import { NextResponse } from "next/server";
import { sanitizeNextPath } from "@/lib/security";
import { createClient } from "@/utils/supabase/server";
import { getServerURL } from "@/utils/url-helpers";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error: authError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!authError) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Only initialize profile for new users; avoid overwriting existing profile/role/activation during password recovery
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (!existingProfile) {
          const metadata = user.user_metadata || {};
          const fullName =
            typeof metadata.full_name === "string" ? metadata.full_name : null;
          const birthdate =
            typeof metadata.birthdate === "string" ? metadata.birthdate : null;
          const isParent = metadata.is_parent === true;

          const { error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              full_name: fullName,
              // react-doctor-disable-next-line supabase-client-owned-authz-field -- Server callback setting initial default profile role
              role: isParent ? "parent" : "member",
              birthdate,
              is_activated: false,
            });

          if (insertError) {
            console.error(
              "Error inserting initial user profile in auth callback:",
              insertError,
            );
          }
        }
      }
    }
  }

  const fallbackPath = next === "/" ? "/auth/activation-review" : next;
  return NextResponse.redirect(`${await getServerURL()}${fallbackPath}`);
}
