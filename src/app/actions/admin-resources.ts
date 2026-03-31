"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

// ----- RESOURCES -----

export async function getResources() {
  const supabase = await createClient();
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

  if (profile?.role !== "admin") {
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

  if (profile?.role !== "admin") {
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
  const supabase = await createClient();
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
  const supabase = await createClient();

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

export async function releaseResourceBooking(resourceBookingId: string) {
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
  const isAdmin = profile?.role === "admin";

  if (!isAdmin) {
    const { data: booking } = await supabase
      .from("resource_bookings")
      .select("tour_id")
      .eq("id", resourceBookingId)
      .single();

    if (!booking) return { error: "Buchung nicht gefunden." };

    const { data: isGuide } = await supabase
      .from("tour_guides")
      .select("id")
      .eq("tour_id", booking.tour_id)
      .eq("user_id", user.id)
      .single();

    if (!isGuide) {
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
