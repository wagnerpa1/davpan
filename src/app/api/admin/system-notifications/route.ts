import { type NextRequest, NextResponse } from "next/server";
import {
  resolveAdminSystemTargets,
  SYSTEM_TARGET_MODES,
  SYSTEM_TARGET_ROLES,
  type SystemTargetMode,
  type SystemTargetRole,
} from "@/lib/notifications/admin-targeting";
import { dispatchNotification } from "@/lib/notifications/dispatcher";
import { isSameOriginRequest } from "@/lib/security";
import { createClient } from "@/utils/supabase/server";
import { getServerURL } from "@/utils/url-helpers";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const targetModeRaw = formData.get("target_mode")?.toString().trim() ?? "all";
  const roles = formData
    .getAll("roles")
    .map((value) => value.toString().trim())
    .filter((value): value is SystemTargetRole =>
      (SYSTEM_TARGET_ROLES as readonly string[]).includes(value),
    );
  const groupIds = formData
    .getAll("group_ids")
    .map((value) => value.toString().trim())
    .filter((value) => UUID_REGEX.test(value));

  if (!title || !message) {
    return NextResponse.json(
      { error: "Titel und Nachricht sind erforderlich." },
      { status: 400 },
    );
  }

  if (title.length > 120 || message.length > 4000) {
    return NextResponse.json(
      { error: "Titel oder Nachricht sind zu lang." },
      { status: 400 },
    );
  }

  if (!(SYSTEM_TARGET_MODES as readonly string[]).includes(targetModeRaw)) {
    return NextResponse.json({ error: "Ungültiger Target-Modus." }, { status: 400 });
  }

  const targetMode = targetModeRaw as SystemTargetMode;

  if (targetMode === "roles" && roles.length === 0) {
    return NextResponse.json(
      { error: "Bitte mindestens eine Rolle wählen." },
      { status: 400 },
    );
  }

  if (targetMode === "tour_groups" && groupIds.length === 0) {
    return NextResponse.json(
      { error: "Bitte mindestens eine Tour-Gruppe wählen." },
      { status: 400 },
    );
  }

  const { userIds, childIds } = await resolveAdminSystemTargets(
    supabase,
    targetMode,
    roles,
    groupIds,
  );

  for (const userId of userIds) {
    await dispatchNotification(supabase, {
      type: "system",
      title,
      body: message,
      payload: {
        source: "admin_system_notification",
        target_mode: targetMode,
      },
      recipientUserId: userId,
      relatedTourId: null,
      relatedGroupId: null,
    });
  }

  for (const childId of childIds) {
    await dispatchNotification(supabase, {
      type: "system",
      title,
      body: message,
      payload: {
        source: "admin_system_notification",
        target_mode: targetMode,
      },
      recipientChildId: childId,
      relatedTourId: null,
      relatedGroupId: null,
    });
  }

  await (supabase as any).from("admin_system_notification_audit").insert({
    sent_by: user.id,
    title,
    message,
    target_mode: targetMode,
    target_roles: targetMode === "roles" ? roles : [],
    target_group_ids: targetMode === "tour_groups" ? groupIds : [],
    user_target_count: userIds.length,
    child_target_count: childIds.length,
  });

  return NextResponse.redirect(new URL("/admin/news", await getServerURL()), {
    status: 303,
  });
}
