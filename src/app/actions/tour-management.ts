"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/utils/supabase/server";

export async function getAvailableGuides() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .or("role.eq.guide,role.eq.admin")
    .order("full_name");
  return data || [];
}

export async function createTour(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  // Check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "guide" && profile.role !== "admin")) {
    throw new Error("Forbidden: Only guides and admins can create tours");
  }

  const title = formData.get("title")?.toString();
  const description = formData.get("description")?.toString();
  const category = formData.get("category")?.toString();
  const target_area = formData.get("target_area")?.toString();
  const start_date = formData.get("start_date")?.toString();
  const end_date = formData.get("end_date")?.toString() || start_date;
  const meeting_point = formData.get("meeting_point")?.toString();
  const meeting_time = formData.get("meeting_time")?.toString();
  const difficulty = formData.get("difficulty")?.toString() || null;
  const elevation = parseInt(formData.get("elevation")?.toString() || "0", 10);
  const distance = parseFloat(formData.get("distance")?.toString() || "0");
  const duration_hours = parseFloat(
    formData.get("duration_hours")?.toString() || "0",
  );
  const max_participants_raw = formData.get("max_participants")?.toString();
  const max_participants = max_participants_raw
    ? parseInt(max_participants_raw, 10) || null
    : null;
  const min_age_raw = formData.get("min_age")?.toString();
  const min_age = min_age_raw ? parseInt(min_age_raw, 10) || null : null;
  const cost_info = formData.get("cost_info")?.toString();
  const requirements = formData.get("requirements")?.toString();
  const status = formData.get("status")?.toString() || "planning";

  // Get all selected guides
  const guideIds = formData.getAll("guide_ids") as string[];

  const { data: tour, error } = await supabase
    .from("tours")
    .insert({
      title,
      description,
      category,
      target_area,
      start_date,
      end_date,
      meeting_point,
      meeting_time,
      difficulty: difficulty || null,
      elevation: elevation || null,
      distance: distance || null,
      duration_hours: duration_hours || null,
      max_participants: max_participants || null,
      min_age: min_age || null,
      cost_info,
      requirements,
      status,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating tour:", error);
    throw new Error("Failed to create tour");
  }

  // Insert guides
  if (guideIds.length > 0) {
    const guideInserts = guideIds.map((uid) => ({
      tour_id: tour.id,
      user_id: uid,
    }));
    await supabase.from("tour_guides").insert(guideInserts);
  } else if (profile.role === "guide") {
    // If no guides selected but user is guide, add them as default
    await supabase.from("tour_guides").insert({
      tour_id: tour.id,
      user_id: user.id,
    });
  }

  revalidatePath("/touren");
  redirect(`/touren/${tour.id}`);
}

export async function updateTour(tourId: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  // Check role and permissions
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");

  // Admins can update anything. Guides only if they are assigned.
  if (profile.role !== "admin") {
    const { data: isGuide } = await supabase
      .from("tour_guides")
      .select("id")
      .eq("tour_id", tourId)
      .eq("user_id", user.id)
      .single();

    if (!isGuide && profile.role !== "guide") {
      // Check if they are the creator as fallback
      const { data: tourCheck } = await supabase
        .from("tours")
        .select("created_by")
        .eq("id", tourId)
        .single();
      if (tourCheck?.created_by !== user.id) {
        throw new Error("Forbidden: You are not authorized to edit this tour");
      }
    }
  }

  const payload: Record<string, string | number | null> = {};
  const fields = [
    "title",
    "description",
    "category",
    "group",
    "target_area",
    "start_date",
    "end_date",
    "meeting_point",
    "meeting_time",
    "difficulty",
    "elevation",
    "distance",
    "duration_hours",
    "max_participants",
    "cost_info",
    "requirements",
    "status",
  ];

  fields.forEach((field) => {
    const val = formData.get(field);
    if (val !== null) {
      const strVal = val.toString();
      if (["elevation", "max_participants"].includes(field)) {
        payload[field] = strVal ? parseInt(strVal, 10) || null : null;
      } else if (["distance", "duration_hours"].includes(field)) {
        payload[field] = strVal ? parseFloat(strVal) || null : null;
      } else {
        payload[field] = strVal || null;
      }
    }
  });

  // min_age – only include if the column exists (added via migration)
  const minAgeRaw = formData.get("min_age")?.toString();
  if (minAgeRaw !== undefined && minAgeRaw !== null) {
    payload.min_age = minAgeRaw ? parseInt(minAgeRaw, 10) || null : null;
  }

  const { error } = await supabase
    .from("tours")
    .update(payload)
    .eq("id", tourId);

  if (error) {
    console.error(
      "Error updating tour — payload sent:",
      JSON.stringify(payload, null, 2),
    );
    console.error("Supabase error details:", error);
    throw new Error(`Failed to update tour: ${error.message}`);
  }

  // Sync guides
  const guideIds = formData.getAll("guide_ids") as string[];
  if (guideIds.length > 0) {
    // Delete existing
    await supabase.from("tour_guides").delete().eq("tour_id", tourId);
    // Insert new
    const guideInserts = guideIds.map((uid) => ({
      tour_id: tourId,
      user_id: uid,
    }));
    await supabase.from("tour_guides").insert(guideInserts);
  }

  revalidatePath("/touren");
  revalidatePath(`/touren/${tourId}`);
  redirect(`/touren/${tourId}`);
}

export async function deleteTour(tourId: string) {
  const supabase = await createClient();

  // Similar check as update
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    const { data: tour } = await supabase
      .from("tours")
      .select("created_by")
      .eq("id", tourId)
      .single();
    if (tour?.created_by !== user.id) {
      throw new Error("Forbidden");
    }
  }

  const { error } = await supabase.from("tours").delete().eq("id", tourId);
  if (error) throw new Error("Failed to delete tour");

  revalidatePath("/touren");
  redirect("/touren");
}

// Throttle: do not run DB-write more than once every 60 seconds process-wide.
let _lastSyncTs = 0;

async function _doSyncTourStatuses() {
  const now = Date.now();
  if (now - _lastSyncTs < 60_000) {
    return { completedCount: 0, skipped: true };
  }
  _lastSyncTs = now;

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: expiredTours, error } = await supabase
    .from("tours")
    .update({ status: "completed" })
    .lt("end_date", today)
    .neq("status", "completed")
    .select("id");

  if (error) {
    console.error("Error syncing tour statuses:", error);
    return { error: error.message };
  }

  if (expiredTours && expiredTours.length > 0) {
    revalidatePath("/touren");
  }

  return { completedCount: expiredTours?.length || 0 };
}

// React cache() deduplicates within the same render pass (layout + page run together).
export const syncTourStatuses = cache(_doSyncTourStatuses);
