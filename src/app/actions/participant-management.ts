"use server";

import { revalidatePath } from "next/cache";
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
      .select("tour_id")
      .eq("id", registrationId)
      .single(),
  ]);

  if (!regRes.data) throw new Error("Registration not found");

  const tourId = regRes.data.tour_id;
  const userRole = profileRes.data?.role;

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

  const { error } = await supabase
    .from("tour_participants")
    .update({ status: newStatus })
    .eq("id", registrationId);

  if (error) {
    console.error("Supabase Error updating status:", error);
    throw new Error(`Failed to update status: ${error.message}`);
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
    }
  }

  revalidatePath(`/touren/${tourId}`);
  return { success: true };
}
