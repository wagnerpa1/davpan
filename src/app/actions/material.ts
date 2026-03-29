"use server";

import { revalidatePath } from "next/cache";
import {
  dispatchNotification,
  dispatchToUsers,
} from "@/lib/notifications/dispatcher";
import { resolveMaterialManagerUserIds } from "@/lib/notifications/targets";
import { createClient } from "@/utils/supabase/server";

export async function createIndependentMaterialReservation(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Du musst angemeldet sein, um Material zu reservieren." };
  }

  const inventoryId = formData.get("inventoryId") as string;
  const loanDate = formData.get("loanDate") as string;
  const returnDate = formData.get("returnDate") as string;

  if (!inventoryId || !loanDate || !returnDate) {
    return { error: "Bitte fülle alle Pflichtfelder aus." };
  }

  try {
    // 2. Check availability
    const { data: invItem, error: invError } = await supabase
      .from("material_inventory")
      .select("quantity_available")
      .eq("id", inventoryId)
      .gt("quantity_available", 0)
      .single();

    if (invError || !invItem) {
      await dispatchNotification(supabase, {
        type: "material",
        title: "Materialreservierung nicht möglich",
        body: "Die Reservierung konnte nicht erstellt werden, weil im gewaehlten Zeitraum kein Bestand verfuegbar ist.",
        payload: {
          status: "failed",
          url: "/material",
        },
        recipientUserId: user.id,
      });
      return {
        error:
          "Dieses Material ist im gewählten Zeitraum oder in dieser Größe nicht mehr verfügbar.",
      };
    }

    const { error: mError } = await supabase
      .from("material_reservations")
      .insert({
        material_inventory_id: inventoryId,
        user_id: user.id,
        quantity: 1, // Standard für Einzelbuchungen
        loan_date: loanDate,
        return_date: returnDate,
        status: "requested",
      });

    if (mError) {
      console.error("Independent Material reservation failed:", mError);
      return { error: "Fehler beim Erstellen der Reservierung." };
    }

    const managerIds = await resolveMaterialManagerUserIds(supabase);
    if (managerIds.length > 0) {
      await dispatchToUsers(supabase, managerIds, {
        type: "material",
        title: "Neue Materialanfrage",
        body: "Eine neue private Materialreservierung wartet auf Bearbeitung.",
        payload: {
          status: "requested",
          url: "/admin/material/reservations",
        },
        relatedTourId: null,
        relatedGroupId: null,
      });
    }

    revalidatePath("/material");
    return {
      success: true,
      message:
        "Material erfolgreich angefragt. Das Material-Team bestaetigt die Reservierung.",
    };
  } catch (err: unknown) {
    console.error("Registration error:", err);
    return { error: "Bei der Buchung ist ein Fehler aufgetreten." };
  }
}

export async function cancelOwnPrivateMaterialReservation(
  reservationId: string,
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Nicht eingeloggt.");
  }

  const { data: reservation, error: reservationError } = await supabase
    .from("material_reservations")
    .select("id, user_id, tour_id, status, material_inventory_id")
    .eq("id", reservationId)
    .single();

  if (reservationError || !reservation) {
    throw new Error("Reservierung nicht gefunden.");
  }

  if (reservation.user_id !== user.id || reservation.tour_id !== null) {
    throw new Error("Keine Berechtigung fuer diese Reservierung.");
  }

  if (reservation.status === "cancelled" || reservation.status === "returned") {
    throw new Error("Diese Reservierung kann nicht mehr storniert werden.");
  }

  if (reservation.status === "reserved" || reservation.status === "on loan") {
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

  const { error: updateError } = await supabase
    .from("material_reservations")
    .update({ status: "cancelled" })
    .eq("id", reservationId);

  if (updateError) {
    throw new Error("Stornierung fehlgeschlagen.");
  }

  revalidatePath("/material");
  revalidatePath("/admin/material/reservations");
}
