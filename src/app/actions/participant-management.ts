"use server";

import { revalidatePath } from "next/cache";
import { dispatchNotification } from "@/lib/notifications/dispatcher";
import { notifyTourOpenForSubscribers } from "@/lib/notifications/targets";
import { promoteWaitlistParticipants } from "@/lib/tours/waitlist";
import { createClient } from "@/utils/supabase/server";

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

  const { error } = await supabase
    .from("tour_participants")
    .update({ status: newStatus })
    .eq("id", registrationId);

  if (error) {
    console.error("Supabase Error updating status:", error);
    throw new Error(`Failed to update status: ${error.message}`);
  }

  const notificationType =
    newStatus === "waitlist" ? "waitlist" : ("registration" as const);

  const statusText: Record<typeof newStatus, string> = {
    confirmed: "bestaetigt",
    cancelled: "abgelehnt",
    pending: "auf pending gesetzt",
    waitlist: "auf die Warteliste gesetzt",
  };

  if (newStatus === "confirmed" || newStatus === "cancelled") {
    await dispatchNotification(supabase, {
      type: notificationType,
      title:
        newStatus === "confirmed"
          ? "Anmeldung bestaetigt"
          : "Anmeldung abgelehnt",
      body: `Deine Anmeldung fuer "${tourInfo?.title || "diese Tour"}" wurde ${statusText[newStatus]}.`,
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

  const freesCapacity =
    newStatus === "cancelled" &&
    (previousStatus === "confirmed" || previousStatus === "pending");

  if (freesCapacity) {
    await promoteWaitlistParticipants({
      supabase,
      tourId,
    });
  }

  // Keep material reservations in sync with participant status.
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

  // Sync tour status
  const { data: tour } = await supabase
    .from("tours")
    .select("max_participants, status")
    .eq("id", tourId)
    .single();
  if (tour?.max_participants) {
    const { count } = await supabase
      .from("tour_participants")
      .select("*", { count: "exact", head: true })
      .eq("tour_id", tourId)
      .in("status", ["confirmed", "pending"]);

    const currentCount = count || 0;
    let targetStatus = tour.status;

    if (currentCount >= tour.max_participants) {
      targetStatus = "full";
    } else if (tour.status === "full") {
      targetStatus = "open";
    }

    if (targetStatus !== tour.status) {
      await supabase
        .from("tours")
        .update({ status: targetStatus })
        .eq("id", tourId);

      if (
        targetStatus === "open" &&
        tour.status !== "open" &&
        tourInfo?.group &&
        tourInfo?.title
      ) {
        await notifyTourOpenForSubscribers(supabase, {
          tourId,
          title: tourInfo.title,
          groupId: tourInfo.group,
        });
      }
    }
  }

  revalidatePath(`/touren/${tourId}`);
  revalidatePath("/admin/material/reservations");
  return { success: true };
}