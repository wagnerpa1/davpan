import { type NextRequest, NextResponse } from "next/server";
import { dispatchNotification } from "@/lib/notifications/dispatcher";
import { isSameOriginRequest } from "@/lib/security";
import { createClient } from "@/utils/supabase/server";
import { getServerURL } from "@/utils/url-helpers";

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { supabase, user: null, error: "Unauthorized", status: 401 };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { supabase, user: null, error: "Forbidden", status: 403 };
  }

  return { supabase, user, error: null, status: 200 };
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json(
      { error: "CSRF validation failed" },
      { status: 403 },
    );
  }

  const auth = await requireAdmin();
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const formData = await req.formData();
  const title = formData.get("title")?.toString().trim();
  const content = formData.get("content")?.toString().trim();
  const imageUrlRaw = formData.get("image_url")?.toString().trim();
  const image_url = imageUrlRaw ? imageUrlRaw : null;

  if (!title || !content) {
    return NextResponse.json(
      { error: "Titel und Inhalt sind erforderlich." },
      { status: 400 },
    );
  }

  const { data: insertedNews, error: newsError } = await auth.supabase
    .from("news_posts")
    .insert({
      title,
      content,
      image_url,
      published_by: auth.user.id,
    })
    .select("id")
    .single();

  if (newsError || !insertedNews) {
    return NextResponse.json(
      { error: newsError?.message || "News konnte nicht erstellt werden." },
      { status: 500 },
    );
  }

  const [profilesResult, childResult] = await Promise.all([
    auth.supabase.from("profiles").select("id"),
    auth.supabase.from("child_profiles").select("id"),
  ]);

  const titlePrefix = `Neue Vereinsnews: ${title}`;
  const bodyPreview =
    content.length > 200 ? `${content.slice(0, 197)}...` : content;

  for (const profile of profilesResult.data ?? []) {
    await dispatchNotification(auth.supabase, {
      type: "news",
      title: titlePrefix,
      body: bodyPreview,
      payload: { news_post_id: insertedNews.id },
      recipientUserId: profile.id,
      newsPostId: insertedNews.id,
    });
  }

  for (const child of childResult.data ?? []) {
    await dispatchNotification(auth.supabase, {
      type: "news",
      title: titlePrefix,
      body: bodyPreview,
      payload: { news_post_id: insertedNews.id },
      recipientChildId: child.id,
      newsPostId: insertedNews.id,
    });
  }

  return NextResponse.redirect(new URL("/admin/news", await getServerURL()), {
    status: 303,
  });
}

export async function DELETE(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json(
      { error: "CSRF validation failed" },
      { status: 403 },
    );
  }

  const auth = await requireAdmin();
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  }

  const { error } = await auth.supabase
    .from("news_posts")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
