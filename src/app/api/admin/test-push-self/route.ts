import { type NextRequest, NextResponse } from "next/server";
import { dispatchNotification } from "@/lib/notifications/dispatcher";
import { isSameOriginRequest } from "@/lib/security";
import { createClient } from "@/utils/supabase/server";
import { getServerURL } from "@/utils/url-helpers";

// TEMP DEBUG: One-click browser push smoke test for admins.
// Remove this route once push delivery is stable in production.
export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json(
      { error: "CSRF validation failed" },
      { status: 403 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const stamp = now.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  await dispatchNotification(supabase, {
    type: "system",
    title: "Test-Push",
    body: `Push-Test erfolgreich ausgelöst um ${stamp}.`,
    payload: {
      source: "admin_test_push",
      url: "/profile",
    },
    recipientUserId: user.id,
    relatedTourId: null,
    relatedGroupId: null,
  });

  return NextResponse.redirect(
    new URL("/admin/news?saved=test_push", await getServerURL()),
    { status: 303 },
  );
}
