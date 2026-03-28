import webpush from "web-push";
import { createAdminClient } from "@/utils/supabase/admin";
import type { Tables } from "@/utils/supabase/types";

interface PushDispatchInput {
  recipientUserId: string | null;
  recipientChildId: string | null;
  title: string;
  body: string;
  payload: Record<string, unknown>;
}

let pushConfigured = false;
let pushDisabled = false;

function configureWebPush() {
  if (pushConfigured || pushDisabled) {
    return;
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

  if (!publicKey || !privateKey) {
    pushDisabled = true;
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  pushConfigured = true;
}

async function resolvePushTargetUserIds(args: {
  recipientUserId: string | null;
  recipientChildId: string | null;
}) {
  const admin = createAdminClient();
  if (!admin) {
    return [] as string[];
  }

  if (args.recipientUserId) {
    const { data: preferenceData } = await admin
      .from("notification_preferences")
      .select("user_id, push_enabled")
      .eq("user_id", args.recipientUserId)
      .maybeSingle();

    const preference = preferenceData as Pick<
      Tables<"notification_preferences">,
      "user_id" | "push_enabled"
    > | null;

    if (!preference?.push_enabled) {
      return [];
    }

    return [args.recipientUserId];
  }

  if (args.recipientChildId) {
    const { data: childPrefsData } = await admin
      .from("child_notification_preferences")
      .select("parent_id, push_enabled")
      .eq("child_id", args.recipientChildId)
      .maybeSingle();

    const childPrefs = childPrefsData as Pick<
      Tables<"child_notification_preferences">,
      "parent_id" | "push_enabled"
    > | null;

    if (!childPrefs?.push_enabled) {
      return [];
    }

    return [childPrefs.parent_id];
  }

  return [];
}

export async function dispatchPushForNotification(input: PushDispatchInput) {
  configureWebPush();
  if (!pushConfigured) {
    return;
  }

  const admin = createAdminClient();
  if (!admin) {
    return;
  }

  const targetUserIds = await resolvePushTargetUserIds({
    recipientUserId: input.recipientUserId,
    recipientChildId: input.recipientChildId,
  });

  if (targetUserIds.length === 0) {
    return;
  }

  const { data: subscriptionsData } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", targetUserIds)
    .is("disabled_at", null);

  const subscriptions = (subscriptionsData ?? []) as Array<
    Pick<Tables<"push_subscriptions">, "id" | "endpoint" | "p256dh" | "auth">
  >;

  const payload = JSON.stringify({
    title: input.title,
    body: input.body,
    payload: input.payload,
  });

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payload,
      );

      await admin
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", sub.id);
    } catch (error: unknown) {
      const statusCode =
        typeof error === "object" && error !== null && "statusCode" in error
          ? Number((error as { statusCode?: number }).statusCode)
          : 0;

      if (statusCode === 404 || statusCode === 410) {
        await admin
          .from("push_subscriptions")
          .update({ disabled_at: new Date().toISOString() })
          .eq("id", sub.id);
      }
    }
  }
}
