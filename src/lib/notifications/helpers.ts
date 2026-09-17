import type { SupabaseClient } from "@supabase/supabase-js";
import { dispatchNotification } from "./dispatcher";

export interface NotificationRecipientTarget {
  recipientUserId: string | null;
  recipientChildId: string | null;
}

export function resolveRecipientTarget(
  userId: string | null | undefined,
  childProfileId: string | null | undefined,
): NotificationRecipientTarget {
  return {
    recipientUserId: childProfileId ? null : (userId ?? null),
    recipientChildId: childProfileId || null,
  };
}

export async function notifyParticipantStatusChange(
  supabase: SupabaseClient,
  params: {
    tourId: string;
    tourTitle?: string | null;
    groupId?: string | null;
    participantId: string;
    userId: string | null;
    childProfileId: string | null;
    oldStatus: string;
    newStatus: "confirmed" | "cancelled" | "pending" | "waitlist";
  },
) {
  const {
    tourId,
    tourTitle,
    groupId,
    participantId,
    userId,
    childProfileId,
    oldStatus,
    newStatus,
  } = params;

  if (newStatus !== "confirmed" && newStatus !== "cancelled") {
    return;
  }

  const statusText = newStatus === "confirmed" ? "bestätigt" : "abgelehnt";
  const title =
    newStatus === "confirmed" ? "Anmeldung bestätigt" : "Anmeldung abgelehnt";

  const target = resolveRecipientTarget(userId, childProfileId);

  await dispatchNotification(supabase, {
    type: "registration",
    title,
    body: `Deine Anmeldung für "${tourTitle || "diese Tour"}" wurde ${statusText}.`,
    payload: {
      participant_id: participantId,
      old_status: oldStatus,
      new_status: newStatus,
      url: `/touren/${tourId}`,
    },
    recipientUserId: target.recipientUserId,
    recipientChildId: target.recipientChildId,
    relatedTourId: tourId,
    relatedGroupId: groupId ?? null,
  });
}

export async function notifyWaitlistPromotedUser(
  supabase: SupabaseClient,
  params: {
    tourId: string;
    tourTitle?: string | null;
    groupId?: string | null;
    promotedUserId?: string | null;
    promotedChildId?: string | null;
  },
) {
  const { tourId, tourTitle, groupId, promotedUserId, promotedChildId } =
    params;

  if (!promotedUserId && !promotedChildId) return;

  const target = resolveRecipientTarget(promotedUserId, promotedChildId);

  await dispatchNotification(supabase, {
    type: "waitlist",
    title: "Du bist nachgerückt",
    body: `Für "${tourTitle || "die Tour"}" ist ein Platz frei geworden. Du bist jetzt bestätigt.`,
    payload: {
      tour_id: tourId,
      participant_id: promotedUserId,
      status: "confirmed",
      url: `/touren/${tourId}`,
    },
    recipientUserId: target.recipientUserId,
    recipientChildId: target.recipientChildId,
    relatedTourId: tourId,
    relatedGroupId: groupId ?? null,
  });
}

export async function notifyMaterialReservationStatusChange(
  supabase: SupabaseClient,
  params: {
    reservationId: string;
    tourId?: string | null;
    tourTitle?: string | null;
    groupId?: string | null;
    userId?: string | null;
    childProfileId?: string | null;
    oldStatus: string;
    newStatus: string;
  },
) {
  const {
    reservationId,
    tourId,
    tourTitle,
    groupId,
    userId,
    childProfileId,
    oldStatus,
    newStatus,
  } = params;

  if (!userId && !childProfileId) return;

  const target = resolveRecipientTarget(userId, childProfileId);
  const isReserved = newStatus === "reserved";
  const title = isReserved
    ? "Materialreservierung bestätigt"
    : "Materialreservierung abgelehnt";

  await dispatchNotification(supabase, {
    type: "material",
    title,
    body: tourTitle
      ? `Deine Materialreservierung für "${tourTitle}" wurde ${isReserved ? "bestätigt" : "abgelehnt"}.`
      : `Deine Materialreservierung wurde ${isReserved ? "bestätigt" : "abgelehnt"}.`,
    payload: {
      reservation_id: reservationId,
      old_status: oldStatus,
      new_status: newStatus,
    },
    recipientUserId: target.recipientUserId,
    recipientChildId: target.recipientChildId,
    relatedTourId: tourId ?? null,
    relatedGroupId: groupId ?? null,
  });
}
