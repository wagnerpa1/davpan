import type { SupabaseClient } from "@supabase/supabase-js";
import {
  dispatchNotification,
  dispatchToUsers,
} from "@/lib/notifications/dispatcher";
import {
  notifyTourOpenForSubscribers,
  resolveTourManagerUserIds,
} from "@/lib/notifications/targets";
import type { Database, Tables } from "@/utils/supabase/types";

interface PromoteWaitlistArgs {
  supabase: SupabaseClient<Database>;
  tourId: string;
}

interface PromoteWaitlistResult {
  promotedCount: number;
}

type WaitlistRow = Pick<
  Tables<"tour_participants">,
  "id" | "waitlist_position" | "created_at"
>;

type TourSummaryRow = Pick<
  Tables<"tours">,
  "id" | "title" | "group" | "max_participants" | "status" | "created_by"
>;

type WaitlistCandidateRow = Pick<
  Tables<"tour_participants">,
  "id" | "user_id" | "child_profile_id"
>;

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
    id: WaitlistRow["id"];
    waitlist_position: WaitlistRow["waitlist_position"];
    created_at: WaitlistRow["created_at"];
  }[];

  for (const [index, row] of queue.entries()) {
    const targetPosition = index + 1;
    if (row.waitlist_position === targetPosition) {
      continue;
    }

    await supabase
      .from("tour_participants")
      .update({ waitlist_position: targetPosition } as never)
      .eq("id", row.id);
  }
}

export async function promoteWaitlistParticipants({
  supabase,
  tourId,
}: PromoteWaitlistArgs): Promise<PromoteWaitlistResult> {
  const { data: tourData } = await supabase
    .from("tours")
    .select("id, title, group, max_participants, status, created_by")
    .eq("id", tourId)
    .maybeSingle();

  const tour = tourData as TourSummaryRow | null;

  if (!tour) {
    return { promotedCount: 0 };
  }

  const managerIds = await resolveTourManagerUserIds(
    supabase,
    tourId,
    tour.created_by ?? null,
  );

  const { count: activeCountRaw } = await supabase
    .from("tour_participants")
    .select("id", { count: "exact", head: true })
    .eq("tour_id", tourId)
    .in("status", ["confirmed", "pending"]);

  let availableSlots = tour.max_participants
    ? Math.max(tour.max_participants - (activeCountRaw ?? 0), 0)
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

    const firstWaitlist = firstWaitlistData as WaitlistCandidateRow | null;

    if (!firstWaitlist) {
      break;
    }

    const { error: promoteError } = await supabase
      .from("tour_participants")
      .update({ status: "confirmed", waitlist_position: null } as never)
      .eq("id", firstWaitlist.id)
      .eq("status", "waitlist");

    if (promoteError) {
      break;
    }

    promotedCount += 1;

    await dispatchNotification(supabase, {
      type: "waitlist",
      title: "Du bist nachgerueckt",
      body: `Fuer "${tour.title}" ist ein Platz frei geworden. Du bist jetzt bestaetigt.`,
      payload: {
        tour_id: tourId,
        participant_id: firstWaitlist.id,
        status: "confirmed",
        url: `/touren/${tourId}`,
      },
      recipientUserId: firstWaitlist.child_profile_id
        ? null
        : firstWaitlist.user_id,
      recipientChildId: firstWaitlist.child_profile_id,
      relatedTourId: tourId,
      relatedGroupId: tour.group,
    });

    if (managerIds.length > 0) {
      await dispatchToUsers(supabase, managerIds, {
        type: "waitlist",
        title: "Warteliste nachgerueckt",
        body: `Bei "${tour.title}" ist ein Wartelistenplatz automatisch nachgerueckt.`,
        payload: {
          tour_id: tourId,
          participant_id: firstWaitlist.id,
          status: "confirmed",
          url: `/touren/${tourId}`,
        },
        relatedTourId: tourId,
        relatedGroupId: tour.group,
      });
    }

    if (availableSlots !== Number.MAX_SAFE_INTEGER) {
      availableSlots -= 1;
    }
  }

  await resequenceWaitlist(supabase, tourId);

  if (
    tour.max_participants &&
    tour.status !== "completed" &&
    tour.status !== "planning"
  ) {
    const { count: activeCountAfterRaw } = await supabase
      .from("tour_participants")
      .select("id", { count: "exact", head: true })
      .eq("tour_id", tourId)
      .in("status", ["confirmed", "pending"]);

    const activeCountAfter = activeCountAfterRaw ?? 0;
    const targetStatus =
      activeCountAfter >= tour.max_participants ? "full" : "open";

    if (tour.status !== targetStatus) {
      await supabase
        .from("tours")
        .update({ status: targetStatus } as never)
        .eq("id", tourId);

      if (targetStatus === "open" && tour.group) {
        await notifyTourOpenForSubscribers(supabase, {
          tourId,
          title: tour.title,
          groupId: tour.group,
        });
      }
    }
  }

  return { promotedCount };
}
