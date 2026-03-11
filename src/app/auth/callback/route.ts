import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/"; // Redirect to feed by default

  if (code) {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (authData?.session && !authError) {
      const { user } = authData.session;
      // Upsert into public.users
      // If the row exists, we just ensure it exists, if not we create it using the metadata.
      const metadata = user.user_metadata || {};
      
      const { error: upsertError } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: metadata.full_name || null,
        role: metadata.role || "member",
        birthdate: metadata.birthdate || null,
      }, { onConflict: "id" });

      if (upsertError) {
        console.error("Error upserting user profile in auth callback:", upsertError);
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${requestUrl.origin}${next}`);
}
