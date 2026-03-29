import type { SupabaseClient } from "@supabase/supabase-js";
import { dispatchNotification } from "@/lib/notifications/dispatcher";
import { createAdminClient } from "@/utils/supabase/admin";
import type { Database } from "@/utils/supabase/types";

type GuideRow = { user_id: string | null };
type OwnerRow = { id: string; role: string };
type ManagerRow = { id: string };
type UserPrefRow = { user_id: string };
type ChildPrefRow = { child_id: string };

export async function resolveTourManagerUserIds(
  supabase: SupabaseClient<Database>,
  tourId: string,
  tourCreatedBy: string | null,
) {
  const managerIds = new Set<string>();

  const [{ data: guidesData }, { data: ownerProfile }] = await Promise.all([
    supabase.from("tour_guides").select("user_id").eq("tour_id", tourId),
    tourCreatedBy
      ? supabase
          .from("profiles")
          .select("id, role")
          .eq("id", tourCreatedBy)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const guides = (guidesData ?? []) as GuideRow[];
  const owner = ownerProfile as OwnerRow | null;

  for (const guide of guides) {
    if (guide.user_id) {
      managerIds.add(guide.user_id);
    }
  }

  if (owner?.id && owner.role === "admin") {
    managerIds.add(owner.id);
  }

  return [...managerIds];
}

export async function resolveMaterialManagerUserIds(
  supabase: SupabaseClient<Database>,
) {
  const { data: managerRows } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["materialwart", "admin"]);

  return ((managerRows ?? []) as ManagerRow[]).map((row) => row.id);
}

export async function notifyTourOpenForSubscribers(
  supabase: SupabaseClient<Database>,
  input: {
    tourId: string;
    title: string;
    groupId: string;
  },
) {
  try {
    const adminClient = createAdminClient();
    const notificationClient = adminClient ?? supabase;

    const [{ data: userPrefs }, { data: childPrefs }] = await Promise.all([
      notificationClient
        .from("notification_preferences")
        .select("user_id")
        .eq("group_notifications_enabled", true)
        .overlaps("tour_group_ids", [input.groupId]),
      notificationClient
        .from("child_notification_preferences")
        .select("child_id")
        .eq("group_notifications_enabled", true)
        .overlaps("tour_group_ids", [input.groupId]),
    ]);

    const userPrefRows = (userPrefs ?? []) as UserPrefRow[];
    const childPrefRows = (childPrefs ?? []) as ChildPrefRow[];

    for (const row of userPrefRows) {
      await dispatchNotification(notificationClient, {
        type: "tour_new",
        title: `Anmeldung offen: ${input.title}`,
        body: `Die Tour "${input.title}" ist jetzt zur Anmeldung freigegeben.`,
        payload: {
          tour_id: input.tourId,
          status: "open",
          url: `/touren/${input.tourId}`,
        },
        recipientUserId: row.user_id,
        relatedTourId: input.tourId,
        relatedGroupId: input.groupId,
      });
    }

    for (const row of childPrefRows) {
      await dispatchNotification(notificationClient, {
        type: "tour_new",
        title: `Anmeldung offen: ${input.title}`,
        body: "Eine Tour deiner abonnierten Gruppe ist jetzt zur Anmeldung freigegeben.",
        payload: {
          tour_id: input.tourId,
          status: "open",
          url: `/touren/${input.tourId}`,
        },
        recipientChildId: row.child_id,
        relatedTourId: input.tourId,
        relatedGroupId: input.groupId,
      });
    }
  } catch (error) {
    // Benachrichtigungsfehler duerfen Kernprozesse wie Tour-Erstellung nicht blockieren.
    console.error("[Notification] notifyTourOpenForSubscribers failed:", error);
  }
}
