"use server";

import { revalidatePath } from "next/cache";
import { buildIdempotencyKey } from "@/lib/idempotency";
import { dispatchNotification } from "@/lib/notifications/dispatcher";
import { createClient } from "@/utils/supabase/server";

function isParticipantTransitionRpcSignatureMismatch(
  error: {
    code?: string;
    message?: string;
  } | null,
) {
  if (!error) return false;

  const message = error.message ?? "";
  return (
    (error.code === "PGRST202" ||
      message.includes(
        "Could not find the function public.apply_participant_status_transition_atomic",
      )) &&
    message.includes("p_idempotency_key")
  );
}

export async function updateParticipantStatus(
  registrationId: string,
  newStatus: "confirmed" | "cancelled" | "pending" | "waitlist",
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Unauthorized");

  // Get user role and registration details
  const [profileRes, regRes] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase
      .from("tour_participants")
      .select("tour_id, user_id, child_profile_id, status")
      .eq("id", registrationId)
      .single(),
  ]);

  if (!regRes.data) throw new Error("Registration not found");

  const tourId = regRes.data.tour_id;
  const previousStatus = regRes.data.status;
  const participantUserId = regRes.data.user_id;
  const participantChildId = regRes.data.child_profile_id;
  const userRole = profileRes.data?.role;

  const { data: tourInfo } = await supabase
    .from("tours")
    .select("group, title")
    .eq("id", tourId)
    .maybeSingle();

  // Permission check
  let canManage = userRole === "admin";
  if (!canManage && userRole === "guide") {
    const { data: leadCheck } = await supabase
      .from("tour_guides")
      .select("id")
      .eq("tour_id", tourId)
      .eq("user_id", user.id)
      .single();

    if (leadCheck) {
      canManage = true;
    }
  }

  if (!canManage) throw new Error("Forbidden");

  const childProfileFilter = participantChildId
    ? `child_profile_id.eq.${participantChildId}`
    : "child_profile_id.is.null";

  const { data: materialReservations } = await supabase
    .from("material_reservations")
    .select("id, status, material_inventory_id")
    .match({
      tour_id: tourId,
      user_id: participantUserId,
    })
    .or(childProfileFilter);

  // Pre-flight check before restoring a participant.
  if (
    materialReservations &&
    previousStatus === "cancelled" &&
    newStatus !== "cancelled"
  ) {
    for (const reservation of materialReservations) {
      if (reservation.status !== "cancelled") {
        continue;
      }

      const { data: inventory } = await supabase
        .from("material_inventory")
        .select("quantity_available")
        .eq("id", reservation.material_inventory_id)
        .single();

      if (!inventory || inventory.quantity_available <= 0) {
        throw new Error(
          "Wiederherstellung nicht möglich: reserviertes Material ist aktuell nicht verfügbar.",
        );
      }
    }
  }

  const transitionParams = {
    p_registration_id: registrationId,
    p_expected_status: previousStatus,
    p_new_status: newStatus,
  };

  let { data: transitionResult, error: transitionError } = await supabase.rpc(
    "apply_participant_status_transition_atomic",
    {
      ...transitionParams,
      p_idempotency_key: buildIdempotencyKey("participant-status", [
        registrationId,
        previousStatus,
        newStatus,
      ]),
    },
  );

  // Backward-compatible retry for environments where PostgREST still exposes
  // the older RPC signature without p_idempotency_key.
  if (isParticipantTransitionRpcSignatureMismatch(transitionError)) {
    const retry = await supabase.rpc(
      "apply_participant_status_transition_atomic",
      transitionParams,
    );
    transitionResult = retry.data;
    transitionError = retry.error;
  }

  if (transitionError) {
    console.error(
      "Supabase RPC error updating participant status:",
      transitionError,
    );
    throw new Error(`Failed to update status: ${transitionError.message}`);
  }

  const notificationType =
    newStatus === "waitlist" ? "waitlist" : ("registration" as const);

  const statusText: Record<typeof newStatus, string> = {
    confirmed: "bestätigt",
    cancelled: "abgelehnt",
    pending: "auf pending gesetzt",
    waitlist: "auf die Warteliste gesetzt",
  };

  if (newStatus === "confirmed" || newStatus === "cancelled") {
    await dispatchNotification(supabase, {
      type: notificationType,
      title:
        newStatus === "confirmed"
          ? "Anmeldung bestätigt"
          : "Anmeldung abgelehnt",
      body: `Deine Anmeldung für "${tourInfo?.title || "diese Tour"}" wurde ${statusText[newStatus]}.`,
      payload: {
        participant_id: registrationId,
        old_status: previousStatus,
        new_status: newStatus,
        url: `/touren/${tourId}`,
      },
      recipientUserId: participantChildId ? null : participantUserId,
      recipientChildId: participantChildId,
      relatedTourId: tourId,
      relatedGroupId: tourInfo?.group ?? null,
    });
  }

  const promotedCount = Number(transitionResult?.promoted_count || 0);
  if (promotedCount > 0) {
    await dispatchNotification(supabase, {
      type: "waitlist",
      title: "Du bist nachgerückt",
      body: `Für "${tourInfo?.title || "die Tour"}" ist ein Platz frei geworden. Du bist jetzt bestätigt.`,
      payload: {
        tour_id: tourId,
        participant_id: transitionResult?.promoted_user_id,
        status: "confirmed",
        url: `/touren/${tourId}`,
      },
      recipientUserId: transitionResult?.promoted_child_id
        ? null
        : transitionResult?.promoted_user_id,
      recipientChildId: transitionResult?.promoted_child_id || null,
      relatedTourId: tourId,
      relatedGroupId: tourInfo?.group ?? null,
    });
  }

  // ...existing code...
  if (materialReservations && materialReservations.length > 0) {
    if (newStatus === "cancelled") {
      for (const reservation of materialReservations) {
        if (reservation.status === "cancelled") {
          continue;
        }

        if (
          reservation.status === "reserved" ||
          reservation.status === "on loan"
        ) {
          const { data: inventory } = await supabase
            .from("material_inventory")
            .select("quantity_available")
            .eq("id", reservation.material_inventory_id)
            .single();

          if (inventory) {
            await supabase
              .from("material_inventory")
              .update({ quantity_available: inventory.quantity_available + 1 })
              .eq("id", reservation.material_inventory_id);
          }
        }

        await supabase
          .from("material_reservations")
          .update({ status: "cancelled" })
          .eq("id", reservation.id);
      }
    }

    // If a previously cancelled participant is restored, reactivate reservation.
    if (previousStatus === "cancelled" && newStatus !== "cancelled") {
      for (const reservation of materialReservations) {
        if (reservation.status !== "cancelled") {
          continue;
        }

        const { data: inventory } = await supabase
          .from("material_inventory")
          .select("quantity_available")
          .eq("id", reservation.material_inventory_id)
          .single();

        if (!inventory || inventory.quantity_available <= 0) {
          continue;
        }

        await supabase
          .from("material_inventory")
          .update({ quantity_available: inventory.quantity_available - 1 })
          .eq("id", reservation.material_inventory_id);

        await supabase
          .from("material_reservations")
          .update({ status: "reserved" })
          .eq("id", reservation.id);
      }
    }
  }

  // Tour status is now automatically synced by trigger on participant update
  // No need to manually calculate and update here

  revalidatePath(`/touren/${tourId}`);
  revalidatePath("/admin/material/reservations");
  return { success: true };
}
