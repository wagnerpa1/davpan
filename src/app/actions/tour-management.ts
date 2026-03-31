"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cache } from "react";
import { dispatchNotification } from "@/lib/notifications/dispatcher";
import { notifyTourOpenForSubscribers } from "@/lib/notifications/targets";
import { createClient } from "@/utils/supabase/server";
import { checkAndBookResource } from "./admin-resources";

export interface TourGuide {
  user_id: string;
  profiles?: {
    id: string;
    full_name: string | null;
  } | null;
}

export interface TourParticipant {
  id: string;
  status: string;
  user_id: string;
  child_profile_id: string | null;
  created_at?: string | null;
  profiles?: {
    full_name: string | null;
    phone: string | null;
    emergency_phone: string | null;
    medical_notes: string | null;
  } | null;
  child_profiles?: {
    full_name: string | null;
    medical_notes: string | null;
  } | null;
}

interface MaterialTypeWithInventory {
  id: string;
  name: string;
  material_inventory: Array<{ size: string | null }> | null;
}

interface TourAudienceTarget {
  user_id: string | null;
  child_profile_id: string | null;
}

async function getTourAudienceTargets(
  tourId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { data } = await supabase
    .from("tour_participants")
    .select("user_id, child_profile_id")
    .eq("tour_id", tourId)
    .in("status", ["pending", "confirmed", "waitlist"]);

  return (data ?? []) as TourAudienceTarget[];
}

async function notifyTourAudience(
  supabase: Awaited<ReturnType<typeof createClient>>,
  audience: TourAudienceTarget[],
  input: {
    type: "tour_update";
    title: string;
    body: string;
    payload: Record<string, unknown>;
    relatedTourId: string;
    relatedGroupId: string | null;
  },
) {
  for (const target of audience) {
    await dispatchNotification(supabase, {
      ...input,
      recipientUserId: target.child_profile_id ? null : target.user_id,
      recipientChildId: target.child_profile_id,
    });
  }
}

type TourUpdatePayload = {
  [K in
    | "title"
    | "description"
    | "category"
    | "group"
    | "target_area"
    | "start_date"
    | "end_date"
    | "meeting_point"
    | "meeting_time"
    | "difficulty"
    | "elevation"
    | "distance"
    | "duration_hours"
    | "max_participants"
    | "cost_info"
    | "requirements"
    | "status"
    | "registration_deadline"
    | "min_age"]?: string | number | null;
};

export async function getTourCategories() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tour_categorys")
    .select("id, category")
    .order("category");
  return data || [];
}

export async function getTourGroups() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tour_groups")
    .select("id, group_name")
    .order("group_name");
  return data || [];
}

export async function getAvailableMaterials() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("material_types")
    .select(`
      id, 
      name,
      material_inventory (size)
    `)
    .order("name");

  return ((data || []) as MaterialTypeWithInventory[]).map((mt) => ({
    id: mt.id,
    name: mt.name,
    size:
      mt.material_inventory
        ?.map((i) => i.size)
        .filter(Boolean)
        .join(", ") || "Universal",
  }));
}

export async function getAvailableGuides() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("role", ["guide", "admin"])
    .order("full_name");
  return data || [];
}

export async function createTour(formData: FormData) {
  const supabase = await createClient();

  const normalizeOptional = (value: FormDataEntryValue | null) => {
    const raw = value?.toString().trim();
    return raw ? raw : null;
  };

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // Check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "guide" && profile.role !== "admin")) {
    redirect("/touren?error=forbidden");
  }

  const title = normalizeOptional(formData.get("title"));
  const description = normalizeOptional(formData.get("description"));
  const category = normalizeOptional(formData.get("category"));
  const group = normalizeOptional(formData.get("group"));
  const target_area = normalizeOptional(formData.get("target_area"));
  const start_date = normalizeOptional(formData.get("start_date"));
  const end_date = normalizeOptional(formData.get("end_date")) || start_date;
  const registration_deadline = normalizeOptional(
    formData.get("registration_deadline"),
  );
  const meeting_point = normalizeOptional(formData.get("meeting_point"));
  const meeting_time = normalizeOptional(formData.get("meeting_time"));
  const difficulty = normalizeOptional(formData.get("difficulty"));
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
  const cost_info = normalizeOptional(formData.get("cost_info"));
  const requirements = normalizeOptional(formData.get("requirements"));
  const statusRaw = normalizeOptional(formData.get("status"));
  const status: "planning" | "open" | "full" | "completed" = [
    "planning",
    "open",
    "full",
    "completed",
  ].includes(statusRaw || "")
    ? (statusRaw as "planning" | "open" | "full" | "completed")
    : "planning";

  if (!title || !start_date) {
    redirect("/touren/neu?error=missing_required");
  }

  // Get all selected guides & materials
  const guideIds = formData.getAll("guide_ids") as string[];
  const materialIds = formData.getAll("material_ids") as string[];
  const resourceIds = formData.getAll("resource_ids") as string[];

  const { data: tour, error } = await supabase
    .from("tours")
    .insert({
      title,
      description,
      category,
      group,
      target_area,
      start_date,
      end_date,
      registration_deadline,
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
    // TEMP DEBUG: keep encoded DB detail in query for faster production diagnosis.
    const debugValue = encodeURIComponent(
      `${error.code || "unknown"}:${error.message}`.slice(0, 220),
    );
    redirect(`/touren/neu?error=create_failed&debug=${debugValue}`);
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

  // Insert materials (tour_material_requirements)
  if (materialIds.length > 0) {
    const materialInserts = materialIds.map((mid) => ({
      tour_id: tour.id,
      material_type_id: mid,
    }));
    await supabase.from("tour_material_requirements").insert(materialInserts);
  }

  // Insert resource bookings
  if (resourceIds.length > 0 && start_date) {
    for (const resId of resourceIds) {
      await checkAndBookResource(
        resId,
        tour.id,
        start_date,
        end_date || start_date,
        user.id,
      );
    }
  }

  if (tour.status === "open" && tour.group) {
    await notifyTourOpenForSubscribers(supabase, {
      tourId: tour.id,
      title: tour.title,
      groupId: tour.group,
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
  if (userError || !user) throw new Error("Unauthorized");

  const payload: TourUpdatePayload = {};
  const { data: previousTour } = await supabase
    .from("tours")
    .select("title, group, start_date, end_date, status")
    .eq("id", tourId)
    .maybeSingle();

  const audienceTargets = await getTourAudienceTargets(tourId, supabase);
  const fields = [
    "title",
    "description",
    "category",
    "group",
    "target_area",
    "start_date",
    "end_date",
    "registration_deadline",
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
  ] as const;

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

  // min_age
  const minAgeRaw = formData.get("min_age")?.toString();
  if (minAgeRaw !== undefined && minAgeRaw !== null) {
    payload.min_age = minAgeRaw ? parseInt(minAgeRaw, 10) || null : null;
  }

  const { error } = await supabase
    .from("tours")
    .update(payload)
    .eq("id", tourId);

  if (error) {
    console.error("Error updating tour:", error);
    throw new Error(`Failed to update tour: ${error.message}`);
  }

  // Sync guides
  const guideIds = formData.getAll("guide_ids") as string[];
  if (guideIds.length > 0) {
    await supabase.from("tour_guides").delete().eq("tour_id", tourId);
    const guideInserts = guideIds.map((uid) => ({
      tour_id: tourId,
      user_id: uid,
    }));
    await supabase.from("tour_guides").insert(guideInserts);
  }

  // Sync materials
  const materialIds = formData.getAll("material_ids") as string[];
  await supabase
    .from("tour_material_requirements")
    .delete()
    .eq("tour_id", tourId);
  if (materialIds.length > 0) {
    const materialInserts = materialIds.map((mid) => ({
      tour_id: tourId,
      material_type_id: mid,
    }));
    await supabase.from("tour_material_requirements").insert(materialInserts);
  }

  // Sync Resource Bookings
  const resourceIds = formData.getAll("resource_ids") as string[];
  await supabase.from("resource_bookings").delete().eq("tour_id", tourId);

  const sd =
    (typeof payload.start_date === "string" && payload.start_date) ||
    formData.get("start_date")?.toString();
  const edCandidate =
    (typeof payload.end_date === "string" && payload.end_date) ||
    formData.get("end_date")?.toString();
  const ed = edCandidate || sd;

  if (resourceIds.length > 0 && sd && ed) {
    for (const resId of resourceIds) {
      await checkAndBookResource(resId, tourId, sd, ed, user.id);
    }
  }

  await notifyTourAudience(supabase, audienceTargets, {
    type: "tour_update",
    title: "Tour aktualisiert",
    body: `Die Tour "${payload.title || previousTour?.title || "Tour"}" wurde aktualisiert. Bitte Details prüfen.`,
    payload: {
      tour_id: tourId,
      previous_status: previousTour?.status ?? null,
      next_status: payload.status ?? previousTour?.status ?? null,
      url: `/touren/${tourId}`,
    },
    relatedTourId: tourId,
    relatedGroupId:
      (typeof payload.group === "string" ? payload.group : null) ??
      previousTour?.group ??
      null,
  });

  const nextStatus =
    typeof payload.status === "string" ? payload.status : previousTour?.status;
  const nextGroupId =
    (typeof payload.group === "string" ? payload.group : null) ??
    previousTour?.group ??
    null;
  const nextTitle =
    (typeof payload.title === "string" ? payload.title : null) ??
    previousTour?.title ??
    "Tour";

  if (nextStatus === "open" && previousTour?.status !== "open" && nextGroupId) {
    await notifyTourOpenForSubscribers(supabase, {
      tourId,
      title: nextTitle,
      groupId: nextGroupId,
    });
  }

  revalidatePath("/touren");
  revalidatePath(`/touren/${tourId}`);
  redirect(`/touren/${tourId}`);
}

export async function deleteTour(tourId: string) {
  const supabase = await createClient();

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

  const [{ data: tourData }, audienceTargets] = await Promise.all([
    supabase
      .from("tours")
      .select("title, group")
      .eq("id", tourId)
      .maybeSingle(),
    getTourAudienceTargets(tourId, supabase),
  ]);

  if (tourData) {
    await notifyTourAudience(supabase, audienceTargets, {
      type: "tour_update",
      title: "Tour abgesagt",
      body: `Die Tour "${tourData.title}" wurde abgesagt.`,
      payload: {
        tour_id: tourId,
        cancelled: true,
      },
      relatedTourId: tourId,
      relatedGroupId: tourData.group,
    });
  }

  const { error } = await supabase.from("tours").delete().eq("id", tourId);
  if (error) throw new Error("Failed to delete tour");

  revalidatePath("/touren");
  redirect("/touren");
}

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
    .select("id");
  if (error) {
    console.error("Error syncing tour statuses:", error);
    return { error: error.message };
  }

  return { completedCount: expiredTours?.length || 0 };
}

export const syncTourStatuses = cache(_doSyncTourStatuses);
