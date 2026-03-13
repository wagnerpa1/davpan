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
    const { error: authError } = await supabase.auth.exchangeCodeForSession(code);

    if (!authError) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Upsert into public.profiles; keeps profile row in sync after OAuth/email callback.
        const metadata = user.user_metadata || {};
        const fullName =
          typeof metadata.full_name === "string" ? metadata.full_name : null;
        const birthdate =
          typeof metadata.birthdate === "string" ? metadata.birthdate : null;
        // Never trust client metadata for elevated roles.
        const role = metadata.role === "parent" ? "parent" : "member";

        const { error: upsertError } = await supabase.from("profiles").upsert(
          {
            id: user.id,
            full_name: fullName,
            role,
            birthdate,
          },
          { onConflict: "id" },
        );

        if (upsertError) {
          console.error(
            "Error upserting user profile in auth callback:",
            upsertError,
          );
        }
      }
    }
  }

  return NextResponse.redirect(`${await getServerURL()}${next}`);
}
