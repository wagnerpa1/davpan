"use server";

import { revalidatePath } from "next/cache";
import { buildIdempotencyKey } from "@/lib/idempotency";
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
    // Use new atomic RPC for independent reservations
    const { error } = await supabase.rpc(
      "reserve_material_independent_atomic",
      {
        p_user_id: user.id,
        p_child_id: null,
        p_material_inventory_id: inventoryId,
        p_loan_date: loanDate,
        p_return_date: returnDate,
        p_quantity: 1,
      },
    );

    if (error) {
      const errorMsg =
        error.message || "Fehler beim Erstellen der Reservierung";

      if (errorMsg.includes("Insufficient inventory")) {
        await dispatchNotification(supabase, {
          type: "material",
          title: "Materialreservierung nicht möglich",
          body: "Die Reservierung konnte nicht erstellt werden, weil im gewählten Zeitraum kein Bestand verfügbar ist.",
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

      console.error("RPC Error:", error);
      return { error: errorMsg };
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
        "Material erfolgreich angefragt. Das Material-Team bestätigt die Reservierung.",
    };
  } catch (err: unknown) {
    console.error("Reservation error:", err);
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

  const { error: rpcError } = await supabase.rpc(
    "cancel_own_private_material_reservation_atomic",
    {
      p_reservation_id: reservationId,
      p_user_id: user.id,
      p_idempotency_key: buildIdempotencyKey("private-material-cancel", [
        reservationId,
        user.id,
      ]),
    },
  );

  if (rpcError) {
    if (rpcError.code === "02000") {
      throw new Error("Reservierung nicht gefunden.");
    }
    if (rpcError.code === "42501") {
      throw new Error("Keine Berechtigung für diese Reservierung.");
    }
    if (rpcError.code === "23514") {
      throw new Error("Diese Reservierung kann nicht mehr storniert werden.");
    }

    throw new Error("Stornierung fehlgeschlagen.");
  }

  revalidatePath("/material");
  revalidatePath("/admin/material/reservations");
}
