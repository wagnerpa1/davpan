"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function registerForTour(formData: FormData) {
  const supabase = await createClient();

  // 1. Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Du musst angemeldet sein, um dich anzumelden." };
  }

  const tourId = formData.get("tourId") as string;
  const childId = formData.get("childId") as string | null;
  const materials = formData.getAll("materials") as string[];

  if (!tourId) {
    return { error: "Tour ID fehlt." };
  }

  // Prevent IDOR: child registrations are only allowed for children owned by the current user.
  if (childId && childId !== "self") {
    const { data: ownedChild, error: childError } = await supabase
      .from("child_profiles")
      .select("id")
      .eq("id", childId)
      .eq("parent_id", user.id)
      .single();

    if (childError || !ownedChild) {
      return { error: "Ungültiges Kind-Profil für diese Anmeldung." };
    }
  }

  try {
    // 2. Check if already registered
    const checkQuery = supabase
      .from("tour_participants")
      .select("id")
      .eq("tour_id", tourId);

    if (childId && childId !== "self") {
      checkQuery.eq("child_profile_id", childId);
    } else {
      checkQuery.eq("user_id", user.id).is("child_profile_id", null);
    }

    const { data: existing } = await checkQuery.single();
    if (existing) {
      return { error: "Für diese Tour bereits angemeldet." };
    }

    // 3. Check tour capacity
    const { data: tour, error: tError } = await supabase
      .from("tours")
      .select("max_participants, status")
      .eq("id", tourId)
      .single();

    if (tError || !tour) {
      return { error: "Tour nicht gefunden." };
    }

    // Get current count of active participants (pending or confirmed)
    const { count, error: cError } = await supabase
      .from("tour_participants")
      .select("*", { count: "exact", head: true })
      .eq("tour_id", tourId)
      .in("status", ["confirmed", "pending"]);

    if (cError) return { error: "Fehler beim Prüfen der Teilnehmerzahl." };

    const currentCount = count || 0;
    const isWaitlist =
      tour.max_participants && currentCount >= tour.max_participants;

    const status = isWaitlist ? "waitlist" : "pending";
    let waitlistPosition = null;

    if (isWaitlist) {
      // Find current max waitlist position
      const { data: lastPos } = await supabase
        .from("tour_participants")
        .select("waitlist_position")
        .eq("tour_id", tourId)
        .eq("status", "waitlist")
        .order("waitlist_position", { ascending: false })
        .limit(1);

      waitlistPosition = (lastPos?.[0]?.waitlist_position || 0) + 1;
    }

    // 4. Create participant record
    const { error: pError } = await supabase.from("tour_participants").insert({
      tour_id: tourId,
      user_id: user.id,
      child_profile_id: childId && childId !== "self" ? childId : null,
      status: status,
      waitlist_position: waitlistPosition,
    });

    if (pError) return { error: "Fehler beim Erstellen der Anmeldung." };

    // 4.5 Auto-update tour status if full
    const newCount = currentCount + 1;
    if (
      tour.max_participants &&
      newCount >= tour.max_participants &&
      tour.status !== "full"
    ) {
      await supabase.from("tours").update({ status: "full" }).eq("id", tourId);
    }

    // 5. Create material reservations
    if (materials.length > 0) {
      const reservationData = materials.map((materialId) => ({
        tour_id: tourId,
        material_id: materialId,
        user_id: user.id,
        child_profile_id: childId && childId !== "self" ? childId : null,
        quantity: 1,
      }));

      const { error: mError } = await supabase
        .from("material_reservations")
        .insert(reservationData);

      if (mError) {
        console.error("Material reservation failed:", mError);
        // We don't fail the whole registration if materials fail, but log it
      }
    }

    revalidatePath(`/touren/${tourId}`);
    return {
      success: true,
      status: status,
      message: isWaitlist
        ? `Du wurdest auf die Warteliste (Position ${waitlistPosition}) gesetzt.`
        : "Anmeldung erfolgreich! Ein Tourenleiter wird sie prüfen.",
    };
  } catch (err: unknown) {
    console.error("Registration error:", err);
    return { error: "Bei der Anmeldung ist ein Fehler aufgetreten." };
  }
}

export async function cancelRegistration(participantId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt." };

  // Get the registration to verify ownership and get tourId
  const { data: reg, error: regError } = await supabase
    .from("tour_participants")
    .select("tour_id, user_id, status")
    .eq("id", participantId)
    .single();

  if (regError || !reg) return { error: "Anmeldung nicht gefunden." };
  if (reg.user_id !== user.id) return { error: "Keine Berechtigung." };

  const { error } = await supabase
    .from("tour_participants")
    .update({ status: "cancelled" })
    .eq("id", participantId);

  if (error) return { error: "Absage fehlgeschlagen." };

  const tourId = reg.tour_id;

  // If the tour was full & status was confirmed, open it up again
  const { data: tour } = await supabase
    .from("tours")
    .select("max_participants, status")
    .eq("id", tourId)
    .single();

  if (tour?.max_participants && tour.status === "full") {
    const { count } = await supabase
      .from("tour_participants")
      .select("*", { count: "exact", head: true })
      .eq("tour_id", tourId)
      .in("status", ["confirmed", "pending"]);

    if ((count || 0) < tour.max_participants) {
      await supabase.from("tours").update({ status: "open" }).eq("id", tourId);
    }
  }

  revalidatePath(`/touren/${tourId}`);
  return { success: true };
}
