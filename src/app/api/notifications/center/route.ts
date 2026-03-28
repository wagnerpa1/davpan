import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

interface NotificationTab {
  id: string;
  label: string;
  targetType: "self" | "child";
  targetId: string;
  unreadCount: number;
  items: {
    id: string;
    type: string;
    title: string;
    body: string;
    created_at: string;
    read_at: string | null;
  }[];
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data: profile }, { data: userNotifications }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase
      .from("notifications")
      .select("id, type, title, body, created_at, read_at")
      .eq("recipient_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const tabs: NotificationTab[] = [
    {
      id: "self",
      label: "Ich",
      targetType: "self",
      targetId: user.id,
      unreadCount:
        userNotifications?.filter((notification) => !notification.read_at)
          .length ?? 0,
      items: userNotifications ?? [],
    },
  ];

  if (profile?.role === "parent") {
    const { data: children } = await supabase
      .from("child_profiles")
      .select("id, full_name")
      .eq("parent_id", user.id)
      .order("full_name", { ascending: true });

    if (children && children.length > 0) {
      const childIds = children.map((child) => child.id);
      const { data: childNotifications } = await supabase
        .from("notifications")
        .select(
          "id, type, title, body, created_at, read_at, recipient_child_id",
        )
        .in("recipient_child_id", childIds)
        .order("created_at", { ascending: false })
        .limit(200);

      for (const child of children) {
        const items =
          childNotifications
            ?.filter(
              (notification) => notification.recipient_child_id === child.id,
            )
            .map(
              ({ recipient_child_id: _recipientChildId, ...item }) => item,
            ) ?? [];

        tabs.push({
          id: `child-${child.id}`,
          label: child.full_name,
          targetType: "child",
          targetId: child.id,
          unreadCount: items.filter((notification) => !notification.read_at)
            .length,
          items,
        });
      }
    }
  }

  return NextResponse.json({ tabs });
}
