"use server";

import { revalidatePath } from "next/cache";
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
        status: "reserved",
      });

    if (mError) {
      console.error("Independent Material reservation failed:", mError);
      return { error: "Fehler beim Erstellen der Reservierung." };
    }

    // 3. Decrement inventory
    await supabase
      .from("material_inventory")
      .update({ quantity_available: invItem.quantity_available - 1 })
      .eq("id", inventoryId);

    revalidatePath("/material");
    return {
      success: true,
      message:
        "Material erfolgreich angefragt. Ein Admin wird die Rückmeldung überprüfen.",
    };
  } catch (err: unknown) {
    console.error("Registration error:", err);
    return { error: "Bei der Buchung ist ein Fehler aufgetreten." };
  }
}
