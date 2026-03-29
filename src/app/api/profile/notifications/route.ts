import { type NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/security";
import { createClient } from "@/utils/supabase/server";
import { getServerURL } from "@/utils/url-helpers";

export async function POST(req: NextRequest) {
  const isAsyncRequest = req.headers.get("x-requested-with") === "XMLHttpRequest";

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

  const formData = await req.formData();
  const selectedGroupIds = formData
    .getAll("tour_group_ids")
    .map((value) => value.toString())
    .filter(Boolean);

  const upsertPayload = {
    user_id: user.id,
    news_enabled: formData.get("news_enabled") === "on",
    system_enabled: formData.get("system_enabled") === "on",
    material_enabled: formData.get("material_enabled") === "on",
    comments_enabled: formData.get("comments_enabled") === "on",
    group_notifications_enabled:
      formData.get("group_notifications_enabled") === "on",
    push_enabled: formData.get("push_enabled") === "on",
    tour_group_ids: selectedGroupIds,
  };

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(upsertPayload, { onConflict: "user_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (isAsyncRequest) {
    return NextResponse.json({ success: true, saved: "notifications_self" });
  }

  return NextResponse.redirect(new URL("/profile?saved=notifications_self", await getServerURL()), {
    status: 303,
  });
}
