import { type NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/security";
import { createClient } from "@/utils/supabase/server";

interface MarkReadPayload {
  targetType?: "self" | "child";
  targetId?: string;
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

  const payload = (await req.json()) as MarkReadPayload;

  if (payload.targetType === "self") {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_user_id", user.id)
      .is("read_at", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  if (payload.targetType === "child" && payload.targetId) {
    const { data: child } = await supabase
      .from("child_profiles")
      .select("id")
      .eq("id", payload.targetId)
      .eq("parent_id", user.id)
      .maybeSingle();

    if (!child) {
      return NextResponse.json(
        { error: "Kind nicht gefunden" },
        { status: 404 },
      );
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_child_id", child.id)
      .is("read_at", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
}
