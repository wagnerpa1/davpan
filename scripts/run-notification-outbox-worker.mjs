#!/usr/bin/env node

/**
 * Minimal worker trigger for notification outbox processing.
 *
 * Usage examples:
 *  - node scripts/run-notification-outbox-worker.mjs
 *  - OUTBOX_WORKER_URL=https://example.com/api/internal/notifications/outbox \
 *    INTERNAL_CRON_SECRET=... node scripts/run-notification-outbox-worker.mjs
 */

const workerUrl =
  process.env.OUTBOX_WORKER_URL ||
  "http://localhost:3000/api/internal/notifications/outbox";
const secret = process.env.INTERNAL_CRON_SECRET || "";
const limit = Number(process.env.OUTBOX_WORKER_LIMIT || "50");
const consumer = process.env.OUTBOX_WORKER_CONSUMER || "push_dispatcher";

if (!secret) {
  console.error(
    "INTERNAL_CRON_SECRET fehlt. Worker-Aufruf wird aus Sicherheitsgruenden abgebrochen.",
  );
  process.exit(1);
}

const url = new URL(workerUrl);
url.searchParams.set("limit", String(Number.isFinite(limit) ? limit : 50));
url.searchParams.set("consumer", consumer);

try {
  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Outbox worker call failed:", response.status, data);
    process.exit(1);
  }

  console.log("Outbox worker result:", data);
} catch (error) {
  console.error("Outbox worker request error:", error);
  process.exit(1);
}
