import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

interface SubscriptionBody {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as SubscriptionBody;

    if (!body.endpoint || !body.p256dh || !body.auth) {
      return NextResponse.json(
        { error: "Missing subscription details" },
        { status: 400 },
      );
    }

    // Check if subscription already exists
    const { data: existingSubscription } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("endpoint", body.endpoint)
      .maybeSingle();

    if (existingSubscription) {
      // Update last used timestamp
      await supabase
        .from("push_subscriptions")
        .update({
          disabled_at: null,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", existingSubscription.id);

      return NextResponse.json({ success: true, isNew: false });
    }

    // Insert new subscription
    const { error } = await supabase.from("push_subscriptions").insert({
      user_id: user.id,
      endpoint: body.endpoint,
      p256dh: body.p256dh,
      auth: body.auth,
      created_at: new Date().toISOString(),
      last_used_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[Push] Error saving subscription:", error);
      return NextResponse.json(
        { error: "Failed to save subscription" },
        { status: 500 },
      );
    }

    console.log(`[Push] New subscription saved for user ${user.id}`);
    return NextResponse.json({ success: true, isNew: true });
  } catch (error) {
    console.error("[Push] Error in subscribe endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
