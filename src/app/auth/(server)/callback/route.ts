import { NextResponse } from "next/server";
import { sanitizeNextPath } from "@/lib/security";
import { createClient } from "@/utils/supabase/server";
import { getServerURL } from "@/utils/url-helpers";
import { initializeUserProfileOnAuth } from "./profile-init.server";

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
        await initializeUserProfileOnAuth(supabase, user);
      }
    }
  }

  const fallbackPath = next === "/" ? "/auth/activation-review" : next;
  return NextResponse.redirect(`${await getServerURL()}${fallbackPath}`);
}
