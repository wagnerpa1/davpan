"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateParticipantStatus(
  registrationId: string, 
  newStatus: "confirmed" | "cancelled" | "pending" | "waitlist"
) {
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  // Map status if needed (legacy or UI helper)
  const statusToUpdate = newStatus as any;

  // Get user role and registration details
  const [profileRes, regRes] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", session.user.id).single(),
    supabase.from("tour_participants").select("tour_id").eq("id", registrationId).single()
  ]);

  if (!regRes.data) throw new Error("Registration not found");
  
  const tourId = regRes.data.tour_id;
  const userRole = profileRes.data?.role;

  // Permission check
  let canManage = userRole === 'admin';
  if (!canManage && userRole === 'guide') {
    const { data: leadCheck } = await supabase
      .from("tour_guides")
      .select("id")
      .eq("tour_id", tourId)
      .eq("user_id", session.user.id)
      .single();
    
    if (leadCheck) {
      canManage = true;
    }
  }

  if (!canManage) throw new Error("Forbidden");

  const { error } = await supabase
    .from("tour_participants")
    .update({ status: statusToUpdate })
    .eq("id", registrationId);

  if (error) {
    console.error("Supabase Error updating status:", error);
    throw new Error("Failed to update status: " + error.message);
  }

  // Sync tour status
  const { data: tour } = await supabase.from("tours").select("max_participants, status").eq("id", tourId).single();
  if (tour && tour.max_participants) {
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
      await supabase.from("tours").update({ status: targetStatus }).eq("id", tourId);
    }
  }

  revalidatePath(`/touren/${tourId}`);
  return { success: true };
}
