import { type NextRequest, NextResponse } from "next/server";
import { dispatchNotification } from "@/lib/notifications/dispatcher";
import { isSameOriginRequest } from "@/lib/security";
import { createClient } from "@/utils/supabase/server";
import { getServerURL } from "@/utils/url-helpers";

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

  const formData = await req.formData();
  const title = formData.get("title")?.toString().trim();
  const message = formData.get("message")?.toString().trim();

  if (!title || !message) {
    return NextResponse.json(
      { error: "Titel und Nachricht sind erforderlich." },
      { status: 400 },
    );
  }

  const [{ data: usersData }, { data: childrenData }] = await Promise.all([
    supabase.from("profiles").select("id"),
    supabase.from("child_profiles").select("id"),
  ]);

  const users = (usersData ?? []) as { id: string }[];
  const children = (childrenData ?? []) as { id: string }[];

  for (const userTarget of users) {
    await dispatchNotification(supabase, {
      type: "system",
      title,
      body: message,
      payload: {
        source: "admin_system_notification",
      },
      recipientUserId: userTarget.id,
      relatedTourId: null,
      relatedGroupId: null,
    });
  }

  for (const childTarget of children) {
    await dispatchNotification(supabase, {
      type: "system",
      title,
      body: message,
      payload: {
        source: "admin_system_notification",
      },
      recipientChildId: childTarget.id,
      relatedTourId: null,
      relatedGroupId: null,
    });
  }

  return NextResponse.redirect(new URL("/admin/news", await getServerURL()), {
    status: 303,
  });
}
