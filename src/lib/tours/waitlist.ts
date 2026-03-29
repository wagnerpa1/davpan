import type { SupabaseClient } from "@supabase/supabase-js";
import {
  dispatchNotification,
  dispatchToUsers,
} from "@/lib/notifications/dispatcher";
import type { Database } from "@/utils/supabase/types";

interface PromoteWaitlistArgs {
  supabase: SupabaseClient<Database>;
  tourId: string;
}

interface PromoteWaitlistResult {
  promotedCount: number;
}

async function resequenceWaitlist(
  supabase: SupabaseClient<Database>,
  tourId: string,
) {
  const { data: queueData } = await supabase
    .from("tour_participants")
    .select("id, waitlist_position, created_at")
    .eq("tour_id", tourId)
    .eq("status", "waitlist")
    .order("waitlist_position", { ascending: true })
    .order("created_at", { ascending: true });

  const queue = (queueData ?? []) as {
    id: string;
    waitlist_position: number | null;
    created_at: string | null;
  }[];

  for (const [index, row] of queue.entries()) {
    const targetPosition = index + 1;
    if (row.waitlist_position === targetPosition) {
      continue;
    }

    await (supabase as any)
      .from("tour_participants")
      .update({ waitlist_position: targetPosition })
      .eq("id", row.id);
  }
}

async function getManagerIds(
  supabase: SupabaseClient<Database>,
  tourId: string,
  tourCreatedBy: string | null,
) {
  const managerIds = new Set<string>();

  const [{ data: guidesData }, { data: ownerProfile }] = await Promise.all([
    (supabase as any).from("tour_guides").select("user_id").eq("tour_id", tourId),
    tourCreatedBy
      ? (supabase as any)
          .from("profiles")
          .select("id, role")
          .eq("id", tourCreatedBy)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const guides = (guidesData ?? []) as { user_id: string | null }[];

  for (const guide of guides) {
    if (guide.user_id) {
      managerIds.add(guide.user_id);
    }
  }

  if ((ownerProfile as any)?.id && (ownerProfile as any)?.role === "admin") {
    managerIds.add((ownerProfile as any).id);
  }

  return [...managerIds];
}

export async function promoteWaitlistParticipants({
  supabase,
  tourId,
}: PromoteWaitlistArgs): Promise<PromoteWaitlistResult> {
  const { data: tour } = await (supabase as any)
    .from("tours")
    .select("id, title, group, max_participants, status, created_by")
    .eq("id", tourId)
    .maybeSingle();

  if (!tour) {
    return { promotedCount: 0 };
  }

  const managerIds = await getManagerIds(
    supabase,
    tourId,
    (tour as any).created_by ?? null,
  );

  const { count: activeCountRaw } = await (supabase as any)
    .from("tour_participants")
    .select("id", { count: "exact", head: true })
    .eq("tour_id", tourId)
    .in("status", ["confirmed", "pending"]);

  let availableSlots = (tour as any).max_participants
    ? Math.max((tour as any).max_participants - (activeCountRaw ?? 0), 0)
    : Number.MAX_SAFE_INTEGER;

  if (availableSlots <= 0) {
    return { promotedCount: 0 };
  }

  let promotedCount = 0;

  while (availableSlots > 0) {
    const { data: firstWaitlistData } = await supabase
      .from("tour_participants")
      .select("id, user_id, child_profile_id")
      .eq("tour_id", tourId)
      .eq("status", "waitlist")
      .order("waitlist_position", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const firstWaitlist = firstWaitlistData as {
      id: string;
      user_id: string | null;
      child_profile_id: string | null;
    } | null;

    if (!firstWaitlist) {
      break;
    }

    const { error: promoteError } = await (supabase as any)
      .from("tour_participants")
      .update({ status: "confirmed", waitlist_position: null })
      .eq("id", firstWaitlist.id)
      .eq("status", "waitlist");

    if (promoteError) {
      break;
    }

    promotedCount += 1;

    await dispatchNotification(supabase, {
      type: "waitlist",
      title: "Du bist nachgerueckt",
      body: `Fuer "${(tour as any).title}" ist ein Platz frei geworden. Du bist jetzt bestaetigt.`,
      payload: {
        tour_id: tourId,
        participant_id: (firstWaitlist as any).id,
        status: "confirmed",
        url: `/touren/${tourId}`,
      },
      recipientUserId: (firstWaitlist as any).child_profile_id
        ? null
        : (firstWaitlist as any).user_id,
      recipientChildId: (firstWaitlist as any).child_profile_id,
      relatedTourId: tourId,
      relatedGroupId: (tour as any).group,
    });

    if (managerIds.length > 0) {
      await dispatchToUsers(supabase, managerIds, {
        type: "waitlist",
        title: "Warteliste nachgerueckt",
        body: `Bei "${(tour as any).title}" ist ein Wartelistenplatz automatisch nachgerueckt.`,
        payload: {
          tour_id: tourId,
          participant_id: (firstWaitlist as any).id,
          status: "confirmed",
          url: `/touren/${tourId}`,
        },
        relatedTourId: tourId,
        relatedGroupId: (tour as any).group,
      });
    }

    if (availableSlots !== Number.MAX_SAFE_INTEGER) {
      availableSlots -= 1;
    }
  }

  await resequenceWaitlist(supabase, tourId);

  if (
    (tour as any).max_participants &&
    (tour as any).status !== "completed" &&
    (tour as any).status !== "planning"
  ) {
    const { count: activeCountAfterRaw } = await (supabase as any)
      .from("tour_participants")
      .select("id", { count: "exact", head: true })
      .eq("tour_id", tourId)
      .in("status", ["confirmed", "pending"]);

    const activeCountAfter = activeCountAfterRaw ?? 0;
    const targetStatus =
      activeCountAfter >= (tour as any).max_participants ? "full" : "open";

    if ((tour as any).status !== targetStatus) {
      await (supabase as any)
        .from("tours")
        .update({ status: targetStatus })
        .eq("id", tourId);
    }
  }

  return { promotedCount };
}





