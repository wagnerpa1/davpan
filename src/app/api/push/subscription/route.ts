import { type NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/security";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

interface SubscribePayload {
  subscription?: {
    endpoint?: string;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  };
}

interface UnsubscribePayload {
  endpoint?: string;
}

interface PushSubscriptionUpsertClient {
  from(table: "push_subscriptions"): {
    upsert(
      values: {
        user_id: string;
        endpoint: string;
        p256dh: string;
        auth: string;
        user_agent: string | null;
        disabled_at: null;
        last_used_at: null;
      },
      options: { onConflict: "endpoint" },
    ): Promise<{ error: { message: string } | null }>;
  };
}

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

  const body = (await req.json()) as SubscribePayload;
  const endpoint = body.subscription?.endpoint;
  const p256dh = body.subscription?.keys?.p256dh;
  const auth = body.subscription?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { error: "Ungültige Subscription-Daten." },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: req.headers.get("user-agent"),
      disabled_at: null,
      last_used_at: null,
    },
    {
      onConflict: "endpoint",
    },
  );

  if (error) {
    // Fallback: endpoint ist global unique; bei Account-Wechsel im selben Browser
    // kann das mit RLS kollidieren. Dann einmal serverseitig mit Service-Role neu zuweisen.
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        {
          error: `push_subscriptions upsert failed: ${error.message}`,
          code: "push_upsert_failed",
        },
        { status: 500 },
      );
    }

    const adminUpsertClient = admin as unknown as PushSubscriptionUpsertClient;

    const { error: adminError } = await adminUpsertClient
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh,
          auth,
          user_agent: req.headers.get("user-agent"),
          disabled_at: null,
          last_used_at: null,
        },
        {
          onConflict: "endpoint",
        },
      );

    if (adminError) {
      return NextResponse.json(
        {
          error: `admin upsert failed: ${adminError.message}`,
          code: "push_upsert_admin_failed",
        },
        { status: 500 },
      );
    }
  }

  const { error: prefError } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        user_id: user.id,
        push_enabled: true,
      },
      {
        onConflict: "user_id",
      },
    );

  if (prefError) {
    return NextResponse.json({ error: prefError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
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

  const body = (await req.json()) as UnsubscribePayload;
  const endpoint = body.endpoint;

  const query = supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id);
  if (endpoint) {
    query.eq("endpoint", endpoint);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: remainingSubs } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .is("disabled_at", null)
    .limit(1);

  if (!remainingSubs || remainingSubs.length === 0) {
    await supabase.from("notification_preferences").upsert(
      {
        user_id: user.id,
        push_enabled: false,
      },
      {
        onConflict: "user_id",
      },
    );
  }

  return NextResponse.json({ success: true });
}
