"use server";

import { revalidatePath } from "next/cache";
import { canManageMaterial, isGuideRole } from "@/lib/auth";
import { dispatchNotification } from "@/lib/notifications/dispatcher";
import { createClient } from "@/utils/supabase/server";

const ALLOWED_STATUS = new Set([
  "requested",
  "reserved",
  "on loan",
  "returned",
  "cancelled",
]);

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  requested: ["reserved", "cancelled"],
  reserved: ["on loan", "cancelled"],
  "on loan": ["returned", "cancelled"],
  returned: [],
  cancelled: [],
};

export async function updateReservationStatus(id: string, newStatus: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!ALLOWED_STATUS.has(newStatus)) {
    return { error: "Ungültiger Status." };
  }

  if (!canManageMaterial(profile?.role) && !isGuideRole(profile?.role)) {
    return { error: "Keine Berechtigung." };
  }

  const { data: reservation, error: reservationError } = await supabase
    .from("material_reservations")
    .select(
      "id, status, tour_id, material_inventory_id, user_id, child_profile_id",
    )
    .eq("id", id)
    .single();

  if (reservationError || !reservation) {
    return { error: "Reservierung nicht gefunden." };
  }

  const currentStatus = reservation.status || "requested";
  if (currentStatus === newStatus) {
    return { success: true };
  }

  if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus)) {
    return {
      error: `Übergang von "${currentStatus}" nach "${newStatus}" ist nicht erlaubt.`,
    };
  }

  if (isGuideRole(profile?.role)) {
    if (!reservation.tour_id) {
      return { error: "Guides dürfen private Ausleihen nicht verwalten." };
    }

    const { data: guideAssignment } = await supabase
      .from("tour_guides")
      .select("id")
      .eq("tour_id", reservation.tour_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!guideAssignment) {
      return { error: "Keine Berechtigung für diese Tour-Reservierung." };
    }
  }

  const adjustInventory = async (delta: 1 | -1) => {
    const { data: inv, error: invError } = await supabase
      .from("material_inventory")
      .select("quantity_available")
      .eq("id", reservation.material_inventory_id)
      .single();

    if (invError || !inv) {
      return { error: "Bestand konnte nicht geladen werden." };
    }

    const nextQuantity = inv.quantity_available + delta;
    if (nextQuantity < 0) {
      return { error: "Nicht genügend Bestand verfügbar." };
    }

    const { error: updateInventoryError } = await supabase
      .from("material_inventory")
      .update({ quantity_available: nextQuantity })
      .eq("id", reservation.material_inventory_id);

    if (updateInventoryError) {
      return { error: "Bestand konnte nicht aktualisiert werden." };
    }

    return { success: true };
  };

  // Bestand bei Freigabe abbuchen, bei Rückgabe/Storno zurückbuchen.
  if (currentStatus === "requested" && newStatus === "reserved") {
    const inventoryResult = await adjustInventory(-1);
    if (inventoryResult.error) {
      if (reservation.user_id || reservation.child_profile_id) {
        await dispatchNotification(supabase, {
          type: "material",
          title: "Materialreservierung nicht möglich",
          body: "Die Reservierung konnte nicht bestaetigt werden, weil aktuell kein Bestand verfuegbar ist.",
          payload: {
            reservation_id: id,
            old_status: currentStatus,
            new_status: "cancelled",
            status: "failed",
          },
          recipientUserId: reservation.child_profile_id
            ? null
            : reservation.user_id,
          recipientChildId: reservation.child_profile_id,
          relatedTourId: reservation.tour_id,
          relatedGroupId: null,
        });
      }
      return inventoryResult;
    }
  }

  if (
    (currentStatus === "reserved" || currentStatus === "on loan") &&
    (newStatus === "returned" || newStatus === "cancelled")
  ) {
    const inventoryResult = await adjustInventory(1);
    if (inventoryResult.error) {
      return inventoryResult;
    }
  }

  const { error } = await supabase
    .from("material_reservations")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) {
    console.error("Update reservation error: ", error);
    return { error: "Fehler beim Aktualisieren des Status." };
  }

  let relatedGroupId: string | null = null;
  let relatedTourTitle: string | null = null;
  if (reservation.tour_id) {
    const { data: tourInfo } = await supabase
      .from("tours")
      .select("group, title")
      .eq("id", reservation.tour_id)
      .maybeSingle();

    relatedGroupId = tourInfo?.group ?? null;
    relatedTourTitle = tourInfo?.title ?? null;
  }

  if (
    (newStatus === "reserved" || newStatus === "cancelled") &&
    (reservation.user_id || reservation.child_profile_id)
  ) {
    const title =
      newStatus === "reserved"
        ? "Materialreservierung bestaetigt"
        : "Materialreservierung abgelehnt";

    await dispatchNotification(supabase, {
      type: "material",
      title,
      body: relatedTourTitle
        ? `Deine Materialreservierung fuer "${relatedTourTitle}" wurde ${newStatus === "reserved" ? "bestaetigt" : "abgelehnt"}.`
        : `Deine Materialreservierung wurde ${newStatus === "reserved" ? "bestaetigt" : "abgelehnt"}.`,
      payload: {
        reservation_id: id,
        old_status: currentStatus,
        new_status: newStatus,
      },
      recipientUserId: reservation.child_profile_id
        ? null
        : reservation.user_id,
      recipientChildId: reservation.child_profile_id,
      relatedTourId: reservation.tour_id,
      relatedGroupId,
    });
  }

  revalidatePath("/admin/material/reservations");
  if (reservation.tour_id) {
    revalidatePath(`/touren/${reservation.tour_id}`);
  }
  return { success: true };
}
