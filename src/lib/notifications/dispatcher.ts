import type { SupabaseClient } from "@supabase/supabase-js";
import { dispatchPushForNotification } from "@/lib/notifications/push-dispatch";
import type { Database, Json } from "@/utils/supabase/types";

type NotificationType =
  | "news"
  | "tour_new"
  | "tour_update"
  | "registration"
  | "waitlist"
  | "material"
  | "comment"
  | "system";

type Audience = "user" | "child";

interface NotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  recipientUserId?: string | null;
  recipientChildId?: string | null;
  relatedTourId?: string | null;
  relatedGroupId?: string | null;
  newsPostId?: string | null;
}

type NotificationInsert =
  Database["public"]["Tables"]["notifications"]["Insert"];

interface NotificationsInsertClient {
  from(table: "notifications"): {
    insert(
      values: NotificationInsert,
    ): Promise<{ error: { message: string } | null }>;
  };
}

interface PreferenceLike {
  news_enabled: boolean;
  system_enabled: boolean;
  material_enabled: boolean;
  comments_enabled: boolean;
  group_notifications_enabled: boolean;
  tour_group_ids: string[];
}

const GROUP_DRIVEN_TYPES = new Set<NotificationType>([
  "tour_new",
  "tour_update",
  "registration",
  "waitlist",
]);

const SENSITIVE_PAYLOAD_KEYS = /(phone|emergency|medical|notes|contact)/i;

const ALLOWED_PAYLOAD_KEYS: Record<NotificationType, Set<string>> = {
  news: new Set(["news_post_id", "url"]),
  tour_new: new Set(["tour_id", "status", "url"]),
  tour_update: new Set([
    "tour_id",
    "previous_status",
    "next_status",
    "cancelled",
    "status",
    "url",
  ]),
  registration: new Set([
    "tour_id",
    "participant_id",
    "status",
    "old_status",
    "new_status",
    "url",
  ]),
  waitlist: new Set([
    "tour_id",
    "participant_id",
    "status",
    "waitlist_position",
    "url",
  ]),
  material: new Set([
    "tour_id",
    "reservation_id",
    "old_status",
    "new_status",
    "status",
    "url",
  ]),
  comment: new Set(["report_id", "comment_id", "url"]),
  system: new Set(["source", "url"]),
};

function sanitizePayload(
  type: NotificationType,
  payload: Record<string, unknown>,
  _audience: Audience,
) {
  const allowedKeys = ALLOWED_PAYLOAD_KEYS[type] ?? new Set<string>();
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (!allowedKeys.has(key)) {
      continue;
    }

    if (SENSITIVE_PAYLOAD_KEYS.test(key)) {
      continue;
    }

    cleaned[key] = value;
  }

  return cleaned;
}

function canPassChannelToggle(type: NotificationType, prefs: PreferenceLike) {
  if (type === "news") return prefs.news_enabled;
  if (type === "system") return prefs.system_enabled;
  if (type === "material") return prefs.material_enabled;
  if (type === "comment") return prefs.comments_enabled;
  return prefs.group_notifications_enabled;
}

function canPassGroupFilter(
  type: NotificationType,
  prefs: PreferenceLike,
  groupId?: string | null,
) {
  if (!GROUP_DRIVEN_TYPES.has(type)) {
    return true;
  }

  if (!groupId) {
    return true;
  }

  return prefs.tour_group_ids.includes(groupId);
}

async function canSendToUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  type: NotificationType,
  groupId?: string | null,
) {
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select(
      "news_enabled, system_enabled, material_enabled, comments_enabled, group_notifications_enabled, tour_group_ids",
    )
    .eq("user_id", userId)
    .maybeSingle();

  // Default = true if no explicit preference row exists yet.
  if (!prefs) {
    return true;
  }

  return (
    canPassChannelToggle(type, prefs) &&
    canPassGroupFilter(type, prefs, groupId)
  );
}

async function canSendToChild(
  supabase: SupabaseClient<Database>,
  childId: string,
  type: NotificationType,
  groupId?: string | null,
) {
  const { data: prefs } = await supabase
    .from("child_notification_preferences")
    .select(
      "news_enabled, system_enabled, material_enabled, comments_enabled, group_notifications_enabled, tour_group_ids",
    )
    .eq("child_id", childId)
    .maybeSingle();

  if (!prefs) {
    return true;
  }

  return (
    canPassChannelToggle(type, prefs) &&
    canPassGroupFilter(type, prefs, groupId)
  );
}

export async function dispatchNotification(
  supabase: SupabaseClient<Database>,
  input: NotificationInput,
) {
  const recipientUserId = input.recipientUserId ?? null;
  const recipientChildId = input.recipientChildId ?? null;

  const targetCount = (recipientUserId ? 1 : 0) + (recipientChildId ? 1 : 0);
  if (targetCount !== 1) {
    return;
  }

  let allowed = false;

  if (recipientUserId) {
    allowed = await canSendToUser(
      supabase,
      recipientUserId,
      input.type,
      input.relatedGroupId,
    );
  }

  if (recipientChildId) {
    allowed = await canSendToChild(
      supabase,
      recipientChildId,
      input.type,
      input.relatedGroupId,
    );
  }

  if (!allowed) {
    return;
  }

  const audience: Audience = recipientChildId ? "child" : "user";
  const payload = sanitizePayload(input.type, input.payload ?? {}, audience);

  const insertPayload: NotificationInsert = {
    type: input.type,
    title: input.title,
    body: input.body,
    payload: payload as Json,
    recipient_user_id: recipientUserId,
    recipient_child_id: recipientChildId,
    related_tour_id: input.relatedTourId ?? null,
    related_group_id: input.relatedGroupId ?? null,
    news_post_id: input.newsPostId ?? null,
  };

  const notificationsClient = supabase as unknown as NotificationsInsertClient;
  const { error } = await notificationsClient
    .from("notifications")
    .insert(insertPayload);

  if (error) {
    console.error("[Notification] Failed to insert notification:", error);
    return;
  }

  console.log(
    `[Notification] Created ${input.type} notification for ${recipientUserId ? "user" : "child"} ${recipientUserId || recipientChildId}: "${input.title}"`,
  );

  await dispatchPushForNotification({
    recipientUserId,
    recipientChildId,
    title: input.title,
    body: input.body,
    payload,
  });
}

export async function dispatchToUsers(
  supabase: SupabaseClient<Database>,
  userIds: string[],
  input: Omit<NotificationInput, "recipientUserId" | "recipientChildId">,
) {
  for (const userId of userIds) {
    await dispatchNotification(supabase, {
      ...input,
      recipientUserId: userId,
    });
  }
}
