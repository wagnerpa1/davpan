"use server";

import { revalidatePath } from "next/cache";
import { buildIdempotencyKey } from "@/lib/idempotency";
import {
  notifyParticipantStatusChange,
  notifyWaitlistPromotedUser,
} from "@/lib/notifications/helpers";
import { isAdminRole, isGuideRole } from "@/lib/permissions";
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
  let canManage = isAdminRole(userRole);
  if (!canManage && isGuideRole(userRole)) {
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
    const cancelledReservations = materialReservations.filter(
      (r) => r.status === "cancelled",
    );
    const inventoryChecks = await Promise.all(
      cancelledReservations.map((reservation) =>
        supabase
          .from("material_inventory")
          .select("quantity_available")
          .eq("id", reservation.material_inventory_id)
          .single(),
      ),
    );
    for (const { data: inventory } of inventoryChecks) {
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

  await notifyParticipantStatusChange(supabase, {
    tourId,
    tourTitle: tourInfo?.title,
    groupId: tourInfo?.group,
    participantId: registrationId,
    userId: participantUserId,
    childProfileId: participantChildId,
    oldStatus: previousStatus,
    newStatus,
  });

  const promotedCount = Number(transitionResult?.promoted_count || 0);
  if (promotedCount > 0) {
    await notifyWaitlistPromotedUser(supabase, {
      tourId,
      tourTitle: tourInfo?.title,
      groupId: tourInfo?.group,
      promotedUserId: transitionResult?.promoted_user_id,
      promotedChildId: transitionResult?.promoted_child_id,
    });
  }

  // Atomic Material Sync: executes in a single PostgreSQL transaction with row locks
  if (materialReservations && materialReservations.length > 0) {
    const { error: materialRpcError } = await supabase.rpc(
      "sync_participant_material_reservations_atomic",
      {
        p_tour_id: tourId,
        p_user_id: participantUserId,
        p_child_profile_id: participantChildId || null,
        p_new_status: newStatus,
        p_previous_status: previousStatus,
        p_idempotency_key: buildIdempotencyKey("participant-material-sync", [
          registrationId,
          previousStatus,
          newStatus,
        ]),
      },
    );

    if (materialRpcError) {
      console.error(
        "Supabase RPC error syncing participant materials:",
        materialRpcError,
      );
      throw new Error(
        `Fehler bei der Materialreservierung: ${materialRpcError.message}`,
      );
    }
  }

  // Tour status is now automatically synced by trigger on participant update
  // No need to manually calculate and update here

  revalidatePath(`/touren/${tourId}`);
  revalidatePath("/admin/material/reservations");
  return { success: true };
}
