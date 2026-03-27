"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

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

  if (profile?.role !== "admin" && profile?.role !== "guide") {
    return { error: "Keine Berechtigung." };
  }

  const { error } = await supabase
    .from("material_reservations")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) {
    console.error("Update reservation error: ", error);
    return { error: "Fehler beim Aktualisieren des Status." };
  }

  revalidatePath("/admin/material/reservations");
  return { success: true };
}
