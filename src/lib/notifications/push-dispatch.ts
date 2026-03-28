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
    console.warn(
      "[Push] VAPID keys not configured (VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY missing). Push notifications disabled."
    );
    pushDisabled = true;
    return;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    console.log("[Push] VAPID configured successfully");
    pushConfigured = true;
  } catch (error) {
    console.error("[Push] Failed to configure VAPID:", error);
    pushDisabled = true;
  }
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
    console.debug(
      "[Push] Push not configured or disabled, skipping push notification"
    );
    return;
  }

  const admin = createAdminClient();
  if (!admin) {
    console.error("[Push] Failed to create admin client");
    return;
  }

  const targetUserIds = await resolvePushTargetUserIds({
    recipientUserId: input.recipientUserId,
    recipientChildId: input.recipientChildId,
  });

  if (targetUserIds.length === 0) {
    console.debug(
      "[Push] No target users for push (permissions disabled or user not found)"
    );
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

  if (subscriptions.length === 0) {
    console.debug(
      "[Push] No active push subscriptions found for target users"
    );
    return;
  }

  const payload = JSON.stringify({
    title: input.title,
    body: input.body,
    payload: input.payload,
  });

  console.log(
    `[Push] Sending push notification to ${subscriptions.length} subscription(s): "${input.title}"`
  );

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

      console.debug(`[Push] Successfully sent to subscription ${sub.id}`);

      await admin
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", sub.id);
    } catch (error: unknown) {
      const statusCode =
        typeof error === "object" && error !== null && "statusCode" in error
          ? Number((error as { statusCode?: number }).statusCode)
          : 0;

      console.error(
        `[Push] Error sending notification to subscription ${sub.id}:`,
        error
      );

      if (statusCode === 404 || statusCode === 410) {
        console.log(
          `[Push] Disabling subscription ${sub.id} (endpoint no longer valid)`
        );
        await admin
          .from("push_subscriptions")
          .update({ disabled_at: new Date().toISOString() })
          .eq("id", sub.id);
      }
    }
  }
}


