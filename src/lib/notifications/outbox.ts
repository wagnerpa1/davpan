import type { SupabaseClient } from "@supabase/supabase-js";
import { dispatchPushForNotification } from "@/lib/notifications/push-dispatch";
import { createAdminClient } from "@/utils/supabase/admin";
import type { Database, Json } from "@/utils/supabase/types";

interface EnqueueNotificationInput {
  notificationId: string;
  eventKey?: string | null;
  payload?: Record<string, unknown>;
}

type DeliveryMode = "direct" | "outbox";

interface OutboxRow {
  id: number;
  event_key: string;
  aggregate_id: string;
  event_version: number;
  attempts: number;
}

interface OutboxSelectClient {
  from(table: "notification_outbox"): {
    select(columns: string): {
      eq(
        column: "status",
        value: "pending",
      ): {
        lte(
          column: "available_at",
          value: string,
        ): {
          order(
            column: "id",
            options: { ascending: boolean },
          ): {
            limit(limit: number): Promise<{
              data: OutboxRow[] | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
      eq(
        column: "aggregate_id",
        value: string,
      ): {
        eq(
          column: "status",
          value: "processed",
        ): {
          order(
            column: "event_version",
            options: { ascending: boolean },
          ): {
            limit(limit: number): Promise<{
              data: Array<{ event_version: number }> | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };
    update(values: {
      status?: "pending" | "processing" | "processed" | "failed";
      locked_at?: string | null;
      processed_at?: string | null;
      attempts?: number;
      available_at?: string;
      last_error?: string | null;
    }): {
      eq(
        column: "id",
        value: number,
      ): {
        eq(
          column: "status",
          value: "pending" | "processing",
        ): Promise<{ data: unknown; error: { message: string } | null }>;
      };
      eq(
        column: "id",
        value: number,
      ): Promise<{
        data: unknown;
        error: { message: string } | null;
      }>;
    };
  };
}

interface OutboxEnqueueRpcClient {
  rpc(
    fn: "enqueue_notification_created_event",
    params: {
      p_notification_id: string;
      p_event_key?: string | null;
      p_payload?: Json;
    },
  ): Promise<{
    data: number | null;
    error: { message: string; code?: string } | null;
  }>;
}

interface ProcessedEventsClient {
  from(table: "processed_events"): {
    insert(values: { consumer: string; event_key: string }): Promise<{
      error: { message: string; code?: string } | null;
    }>;
  };
}

interface NotificationsReadClient {
  from(table: "notifications"): {
    select(columns: string): {
      eq(
        column: "id",
        value: string,
      ): {
        maybeSingle(): Promise<{
          data: {
            recipient_user_id: string | null;
            recipient_child_id: string | null;
            title: string;
            body: string;
            payload: Json;
          } | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
}

const DEFAULT_MAX_OUTBOX_ATTEMPTS = 8;

function parseDeliveryMode(raw: string | undefined): DeliveryMode {
  const value = (raw || "outbox").toLowerCase();
  if (value === "outbox") {
    return "outbox";
  }

  return "direct";
}

export function getNotificationDeliveryMode(): DeliveryMode {
  return parseDeliveryMode(process.env.NOTIFICATION_DELIVERY_MODE);
}

export async function enqueueNotificationCreatedEvent(
  supabase: SupabaseClient<Database>,
  input: EnqueueNotificationInput,
) {
  const client = supabase as unknown as OutboxEnqueueRpcClient;

  const { error } = await client.rpc("enqueue_notification_created_event", {
    p_notification_id: input.notificationId,
    p_event_key: input.eventKey ?? null,
    p_payload: (input.payload ?? {}) as Json,
  });

  if (error) {
    console.error("[Outbox] Failed to enqueue notification event:", error);
    return false;
  }

  return true;
}

export async function processNotificationOutboxBatch(options?: {
  limit?: number;
  consumer?: string;
}) {
  const startedAt = Date.now();
  const admin = createAdminClient();
  if (!admin) {
    return {
      claimed: 0,
      processed: 0,
      failed: 0,
      skipped: 0,
      duration_ms: Date.now() - startedAt,
      message: "admin client missing",
    };
  }

  const outboxClient = admin as unknown as OutboxSelectClient;
  const processedClient = admin as unknown as ProcessedEventsClient;
  const notificationsClient = admin as unknown as NotificationsReadClient;

  const limit = Math.max(1, Math.min(options?.limit ?? 50, 200));
  const consumer = options?.consumer || "push_dispatcher";
  const maxAttempts = Math.max(
    1,
    Number(process.env.NOTIFICATION_OUTBOX_MAX_ATTEMPTS) ||
      DEFAULT_MAX_OUTBOX_ATTEMPTS,
  );

  const { data, error } = await outboxClient
    .from("notification_outbox")
    .select("id, event_key, aggregate_id, event_version, attempts")
    .eq("status", "pending")
    .lte("available_at", new Date().toISOString())
    .order("id", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[Outbox] Polling failed:", error);
    return {
      claimed: 0,
      processed: 0,
      failed: 0,
      skipped: 0,
      duration_ms: Date.now() - startedAt,
      message: error.message,
    };
  }

  const items = data ?? [];
  const claimed = items.length;
  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of items) {
    const lockResult = await outboxClient
      .from("notification_outbox")
      .update({
        status: "processing",
        locked_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("status", "pending");

    if (lockResult.error) {
      skipped += 1;
      continue;
    }

    try {
      const { data: processedVersions, error: processedVersionsError } =
        await outboxClient
          .from("notification_outbox")
          .select("event_version")
          .eq("aggregate_id", item.aggregate_id)
          .eq("status", "processed")
          .order("event_version", { ascending: false })
          .limit(1);

      if (processedVersionsError) {
        throw new Error(processedVersionsError.message);
      }

      const maxProcessedVersion = processedVersions?.[0]?.event_version ?? 0;
      if (maxProcessedVersion >= item.event_version) {
        await outboxClient
          .from("notification_outbox")
          .update({
            status: "processed",
            processed_at: new Date().toISOString(),
            last_error: `stale event suppressed (event_version=${item.event_version}, max_processed_version=${maxProcessedVersion})`,
          })
          .eq("id", item.id);

        skipped += 1;
        continue;
      }

      const dedupe = await processedClient.from("processed_events").insert({
        consumer,
        event_key: item.event_key,
      });

      if (dedupe.error && dedupe.error.code === "23505") {
        await outboxClient
          .from("notification_outbox")
          .update({
            status: "processed",
            processed_at: new Date().toISOString(),
            last_error: null,
          })
          .eq("id", item.id);

        skipped += 1;
        continue;
      }

      if (dedupe.error) {
        throw new Error(dedupe.error.message);
      }

      const { data: notification, error: notificationError } =
        (await notificationsClient
          .from("notifications")
          .select(
            "recipient_user_id, recipient_child_id, title, body, payload, type",
          )
          .eq("id", item.aggregate_id)
          .maybeSingle()) as unknown as {
          data: {
            recipient_user_id: string | null;
            recipient_child_id: string | null;
            title: string;
            body: string;
            payload: unknown;
            type: string;
          } | null;
          error: Error | null;
        };

      if (notificationError) {
        throw new Error(notificationError.message);
      }

      if (!notification) {
        await outboxClient
          .from("notification_outbox")
          .update({
            status: "failed",
            attempts: item.attempts + 1,
            last_error: "notification not found",
          })
          .eq("id", item.id);

        failed += 1;
        continue;
      }

      await dispatchPushForNotification({
        recipientUserId: notification.recipient_user_id,
        recipientChildId: notification.recipient_child_id,
        title: notification.title,
        body: notification.body,
        payload:
          notification.payload && typeof notification.payload === "object"
            ? (notification.payload as Record<string, unknown>)
            : {},
      });

      // Phase 4: Trigger mandatory email for registration/waitlist status changes
      if (
        notification.type === "registration" ||
        notification.type === "waitlist" ||
        notification.type === "tour_update"
      ) {
        if (notification.recipient_user_id) {
          const { data: userData } = await admin.auth.admin.getUserById(
            notification.recipient_user_id,
          );
          if (userData?.user?.email) {
            const { dispatchEmailForNotification } = await import(
              "./email-dispatcher"
            );
            await dispatchEmailForNotification(
              userData.user.email,
              notification.title,
              notification.body,
            );
          }
        }
      }

      await outboxClient
        .from("notification_outbox")
        .update({
          status: "processed",
          processed_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", item.id);

      processed += 1;
    } catch (error: unknown) {
      const nextAttempts = item.attempts + 1;
      const errorMessage =
        error instanceof Error
          ? error.message
          : "unknown outbox processing error";

      if (nextAttempts >= maxAttempts) {
        await outboxClient
          .from("notification_outbox")
          .update({
            status: "failed",
            attempts: nextAttempts,
            last_error: `${errorMessage} (max attempts reached)`,
          })
          .eq("id", item.id);

        failed += 1;
        continue;
      }

      const backoffSeconds = Math.min(300, 2 ** Math.min(nextAttempts, 8));
      const availableAt = new Date(
        Date.now() + backoffSeconds * 1000,
      ).toISOString();

      await outboxClient
        .from("notification_outbox")
        .update({
          status: "pending",
          attempts: nextAttempts,
          available_at: availableAt,
          last_error: errorMessage,
        })
        .eq("id", item.id);

      failed += 1;
    }
  }

  return {
    claimed,
    processed,
    failed,
    skipped,
    duration_ms: Date.now() - startedAt,
    message: "ok",
  };
}
