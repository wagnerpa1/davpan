import { type NextRequest, NextResponse } from "next/server";
import { processNotificationOutboxBatch } from "@/lib/notifications/outbox";

function isAuthorized(request: NextRequest) {
  const configuredSecret = process.env.INTERNAL_CRON_SECRET;

  if (!configuredSecret) {
    return false;
  }

  const bearer = request.headers.get("authorization") || "";
  if (bearer === `Bearer ${configuredSecret}`) {
    return true;
  }

  const headerSecret = request.headers.get("x-internal-cron-secret") || "";
  return headerSecret === configuredSecret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit") || "50");
  const consumer = url.searchParams.get("consumer") || "push_dispatcher";

  const result = await processNotificationOutboxBatch({
    limit: Number.isFinite(limitParam) ? limitParam : 50,
    consumer,
  });

  return NextResponse.json(result, { status: 200 });
}
