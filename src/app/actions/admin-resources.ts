"use server";

import { revalidatePath } from "next/cache";
import { canBookStandaloneResource, isAdminRole } from "@/lib/permissions";
import { createClient } from "@/utils/supabase/server";
import { requireAuth } from "./auth-guards";

async function isUserGuideForTour(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tourId: string,
  userId: string,
) {
  const { data } = await supabase
    .from("tour_guides")
    .select("id")
    .eq("tour_id", tourId)
    .eq("user_id", userId)
    .single();

  return Boolean(data);
}

// ----- RESOURCES -----

export async function getResources() {
  const { supabase, user } = await requireAuth();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!canBookStandaloneResource(profile?.role)) {
    return [];
  }

  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching resources:", error);
    return [];
  }
  return data;
}

export async function createOrUpdateResource(formData: FormData) {
  const supabase = await createClient();

  // Security Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!isAdminRole(profile?.role)) {
    return { error: "Keine Berechtigung (nur Admin)." };
  }

  const id = formData.get("id") as string | null;
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const type = (formData.get("type") as string) || null;
  const capacityStr = formData.get("capacity") as string;
  const capacity = capacityStr ? parseInt(capacityStr, 10) : null;

  if (!name) {
    return { error: "Name ist erforderlich." };
  }

  const resourceData = {
    name,
    description,
    type,
    capacity,
  };

  if (id) {
    const { error } = await supabase
      .from("resources")
      .update(resourceData)
      .eq("id", id);
    if (error) return { error: `Fehler beim Aktualisieren: ${error.message}` };
  } else {
    const { error } = await supabase.from("resources").insert(resourceData);
    if (error) return { error: `Fehler beim Erstellen: ${error.message}` };
  }

  revalidatePath("/admin/resources");
  return { success: true };
}

export async function deleteResource(id: string) {
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

  if (!isAdminRole(profile?.role)) {
    return { error: "Keine Berechtigung (nur Admin)." };
  }

  const { error } = await supabase.from("resources").delete().eq("id", id);
  if (error)
    return {
      error:
        "Konnte Ressource nicht löschen. Womöglich existieren noch aktive Buchungen.",
    };

  revalidatePath("/admin/resources");
  return { success: true };
}

// ----- RESOURCE BOOKINGS -----

export async function getResourceBookings() {
  // Ensure only managers (guide, materialwart, admin) can fetch the full list.
  const userClient = await createClient();

  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) return [];

  const { data: profile } = await userClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role as string | null | undefined;
  if (!role) return [];

  // Only allow guides, materialwarts or admins to view all bookings.
  const isManager =
    role === "admin" || role === "materialwart" || role === "guide";

  if (!isManager) return [];

  // Prefer using the service-role admin client if available so RLS doesn't block reads.
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const adminClient = createAdminClient();

  const supabase = adminClient ?? userClient;

  const { data, error } = await supabase
    .from("resource_bookings")
    .select(`
      *,
      resources(name),
      profiles:created_by(full_name),
      tours(
        id,
        title,
        tour_guides(
          profiles(full_name)
        )
      )
    `)
    .order("start_date");

  if (error) {
    console.error("Error fetching resource bookings:", error);
    return [];
  }
  return data;
}

export async function checkAndBookResource(
  resourceId: string,
  tourId: string,
  startDate: string,
  endDate: string,
  userId: string,
) {
  const { supabase, user } = await requireAuth();

  if (user.id !== userId) {
    return { error: "Keine Berechtigung." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = isAdminRole(profile?.role);
  const canBookForTour =
    isAdmin || (await isUserGuideForTour(supabase, tourId, user.id));

  if (!canBookForTour) {
    return { error: "Keine Berechtigung für diese Tour." };
  }

  // Use new atomic RPC (handles conflict checking + upsert in one transaction)
  const { data, error } = await supabase.rpc("book_resource_for_tour_atomic", {
    p_resource_id: resourceId,
    p_tour_id: tourId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_user_id: userId,
  });

  if (error) {
    return { error: error.message || "Resource booking failed" };
  }

  return { success: true, booking_id: data.booking_id };
}

async function releaseResourceBooking(resourceBookingId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };

  // Permission check: Admin or Guide of this tour
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = isAdminRole(profile?.role);

  if (!isAdmin) {
    const { data: booking } = await supabase
      .from("resource_bookings")
      .select("tour_id")
      .eq("id", resourceBookingId)
      .single();

    if (!booking) return { error: "Buchung nicht gefunden." };

    if (!(await isUserGuideForTour(supabase, booking.tour_id, user.id))) {
      return { error: "Keine Berechtigung für diese Buchung." };
    }
  }

  // Use new atomic RPC
  const { error } = await supabase.rpc("release_resource_booking_atomic", {
    p_booking_id: resourceBookingId,
  });

  if (error) return { error: `Fehler bei Freigabe: ${error.message}` };

  revalidatePath("/admin/resources");
  return { success: true };
}

export async function bookResourceStandalone(
  resourceId: string,
  startDate: string,
  endDate: string,
  reason: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };

  // Permission check: Allow Guide, Materialwart, or Admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!canBookStandaloneResource(profile?.role)) {
    return {
      error:
        "Keine Berechtigung. Nur Guide, Materialwart oder Admin können Ressourcen reservieren.",
    };
  }

  if (!reason || reason.trim().length === 0) {
    return { error: "Grund für die Reservierung ist erforderlich." };
  }

  // Check for time conflicts
  const { data: conflicts, error: conflictError } = await supabase
    .from("resource_bookings")
    .select("id")
    .eq("resource_id", resourceId)
    .neq("status", "released")
    .gte("end_date", startDate)
    .lte("start_date", endDate);

  if (conflictError) {
    return { error: `Fehler bei Konfliktprüfung: ${conflictError.message}` };
  }

  if (conflicts && conflicts.length > 0) {
    return {
      error:
        "Zeitkonflikt: Diese Ressource ist bereits in diesem Zeitraum reserviert.",
    };
  }

  // Create standalone booking
  const { data, error } = await supabase
    .from("resource_bookings")
    .insert({
      resource_id: resourceId,
      tour_id: null,
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim(),
      status: "booked",
      created_by: user.id,
    })
    .select("id");

  if (error) {
    return { error: `Fehler beim Erstellen der Buchung: ${error.message}` };
  }

  revalidatePath("/admin/resources");
  return { success: true, booking_id: data?.[0]?.id };
}

export async function deleteResourceBooking(resourceBookingId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };

  // Permission check
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const { data: booking } = await supabase
    .from("resource_bookings")
    .select("tour_id, created_by")
    .eq("id", resourceBookingId)
    .single();

  if (!booking) return { error: "Buchung nicht gefunden." };

  const isAdmin = isAdminRole(profile?.role);
  const isCreator = booking.created_by === user.id;
  const isGuideOfTour = booking.tour_id
    ? await isUserGuideForTour(supabase, booking.tour_id, user.id)
    : false;

  if (!isAdmin && !isCreator && !isGuideOfTour) {
    return { error: "Keine Berechtigung zum Löschen dieser Buchung." };
  }

  const { error } = await supabase
    .from("resource_bookings")
    .delete()
    .eq("id", resourceBookingId);

  if (error) {
    return { error: `Fehler beim Löschen: ${error.message}` };
  }

  revalidatePath("/admin/resources");
  return { success: true };
}
