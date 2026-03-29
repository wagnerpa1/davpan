"use server";

import { revalidatePath } from "next/cache";
import {
  dispatchNotification,
  dispatchToUsers,
} from "@/lib/notifications/dispatcher";
import {
  notifyTourOpenForSubscribers,
  resolveMaterialManagerUserIds,
  resolveTourManagerUserIds,
} from "@/lib/notifications/targets";
import { promoteWaitlistParticipants } from "@/lib/tours/waitlist";
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
  const materialsDataRaw = formData.get("materialsData") as string;
  let actorDisplayName = "Teilnehmer/in";
  let materials: { material_type_id: string; size: string }[] = [];
  try {
    materials = materialsDataRaw ? JSON.parse(materialsDataRaw) : [];
  } catch (e) {
    console.warn("Could not parse materials JSON", e);
  }

  if (!tourId) {
    return { error: "Tour ID fehlt." };
  }

  // 1.5 Fetch Tour data for capacity and age checks
  const { data: tour, error: tError } = await supabase
    .from("tours")
    .select(
      "max_participants, status, start_date, end_date, min_age, group, title, created_by",
    )
    .eq("id", tourId)
    .single();

  if (tError || !tour) {
    return { error: "Tour nicht gefunden." };
  }

  // 1.6 Age Check
  if (tour.min_age && tour.start_date) {
    let birthdate: string | null = null;
    if (childId && childId !== "self") {
      const { data: child } = await supabase
        .from("child_profiles")
        .select("birthdate, parent_id, full_name")
        .eq("id", childId)
        .single();

      if (child && child.parent_id === user.id) {
        birthdate = child.birthdate;
        actorDisplayName = child.full_name || "Kind";
      } else {
        return { error: "Ungültiges Kind-Profil." };
      }
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("birthdate, full_name")
        .eq("id", user.id)
        .single();
      birthdate = profile?.birthdate || null;
      actorDisplayName = profile?.full_name || "Teilnehmer/in";
    }

    if (birthdate) {
      const bDate = new Date(birthdate);
      const sDate = new Date(tour.start_date);
      let age = sDate.getFullYear() - bDate.getFullYear();
      const m = sDate.getMonth() - bDate.getMonth();
      if (m < 0 || (m === 0 && sDate.getDate() < bDate.getDate())) {
        age--;
      }

      const isUnderMinAge = age < tour.min_age;
      if (isUnderMinAge) {
        // Registrierung bleibt bewusst möglich (Guide kann Ausnahme manuell prüfen/bestätigen).
      }

      // We allow the registration even if too young, but it will be pending/waitlisted
      // The frontend shows a warning. The Guide decides eventually.
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

    // 3. Check capacity
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
    const { data: createdParticipant, error: pError } = await supabase
      .from("tour_participants")
      .insert({
        tour_id: tourId,
        user_id: user.id,
        child_profile_id: childId && childId !== "self" ? childId : null,
        status: status,
        waitlist_position: waitlistPosition,
      })
      .select("id")
      .single();

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
      const reservationData = [];
      const inventoryUpdates = [];

      for (const mReq of materials) {
        // 5.1 Find first available inventory item for this type and size
        const { data: invItem, error: invError } = await supabase
          .from("material_inventory")
          .select("id, quantity_available")
          .eq("material_type_id", mReq.material_type_id)
          .eq("size", mReq.size)
          .gt("quantity_available", 0)
          .limit(1)
          .single();

        if (invError || !invItem) {
          if (createdParticipant?.id) {
            await supabase
              .from("tour_participants")
              .delete()
              .eq("id", createdParticipant.id);
          }
          await dispatchNotification(supabase, {
            type: "material",
            title: "Materialreservierung nicht möglich",
            body: `Die Materialreservierung fuer "${tour.title}" konnte nicht abgeschlossen werden, weil Groesse "${mReq.size}" nicht verfuegbar ist.`,
            payload: {
              tour_id: tourId,
              status: "failed",
              url: `/touren/${tourId}`,
            },
            recipientUserId: user.id,
            relatedTourId: tourId,
            relatedGroupId: tour.group,
          });
          return {
            error: `Material in Größe "${mReq.size}" ist leider nicht mehr verfügbar.`,
          };
        }

        reservationData.push({
          tour_id: tourId,
          material_inventory_id: invItem.id,
          user_id: user.id,
          child_profile_id: childId && childId !== "self" ? childId : null,
          quantity: 1,
          status: "reserved",
          loan_date: tour.start_date || null,
          return_date: tour.end_date || tour.start_date || null,
        });

        inventoryUpdates.push({
          id: invItem.id,
          new_quantity: invItem.quantity_available - 1,
        });
      }

      if (reservationData.length > 0) {
        // 5.2 Insert reservations
        const { error: mError } = await supabase
          .from("material_reservations")
          .insert(reservationData);

        if (mError) {
          if (createdParticipant?.id) {
            await supabase
              .from("tour_participants")
              .delete()
              .eq("id", createdParticipant.id);
          }
          await dispatchNotification(supabase, {
            type: "material",
            title: "Materialreservierung fehlgeschlagen",
            body: `Die Materialreservierung fuer "${tour.title}" konnte nicht gespeichert werden.`,
            payload: {
              tour_id: tourId,
              status: "failed",
              url: `/touren/${tourId}`,
            },
            recipientUserId: user.id,
            relatedTourId: tourId,
            relatedGroupId: tour.group,
          });
          console.error("Material reservation failed:", mError);
          return { error: "Fehler beim Reservieren der Materialien." };
        }

        // 5.3 Decrement inventory for confirmed reservation records
        for (const update of inventoryUpdates) {
          await supabase
            .from("material_inventory")
            .update({ quantity_available: update.new_quantity })
            .eq("id", update.id);
        }
      }
    }

    // Teilnehmer bei Anmeldung NICHT benachrichtigen; nur Verantwortliche informieren.
    const managerIds = await resolveTourManagerUserIds(
      supabase,
      tourId,
      tour.created_by ?? null,
    );

    await dispatchToUsers(supabase, managerIds, {
      type: isWaitlist ? "waitlist" : "registration",
      title: isWaitlist ? "Neue Wartelisten-Anmeldung" : "Neue Tour-Anmeldung",
      body: isWaitlist
        ? `${actorDisplayName} steht jetzt auf der Warteliste fuer "${tour.title}".`
        : `${actorDisplayName} hat sich fuer "${tour.title}" angemeldet (pending).`,
      payload: {
        tour_id: tourId,
        status,
        url: `/touren/${tourId}`,
      },
      relatedTourId: tourId,
      relatedGroupId: tour.group,
    });

    if (materials.length > 0) {
      const materialManagerIds = await resolveMaterialManagerUserIds(supabase);
      await dispatchToUsers(supabase, materialManagerIds, {
        type: "material",
        title: "Neue Materialreservierung",
        body: `${actorDisplayName} hat Material fuer "${tour.title}" angefragt.`,
        payload: {
          tour_id: tourId,
          status,
          url: "/admin/material/reservations",
        },
        relatedTourId: tourId,
        relatedGroupId: tour.group,
      });
    }

    revalidatePath(`/touren/${tourId}`);
    return {
      success: true,
      status: status,
      message: isWaitlist
        ? `Warteliste (Position ${waitlistPosition})`
        : "Erfolgreich angemeldet! Status: Offen",
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
    .select("tour_id, user_id, status, child_profile_id")
    .eq("id", participantId)
    .single();

  if (regError || !reg) return { error: "Anmeldung nicht gefunden." };
  if (reg.user_id !== user.id) return { error: "Keine Berechtigung." };

  const { error } = await supabase
    .from("tour_participants")
    .update({ status: "cancelled" })
    .eq("id", participantId);

  if (error) return { error: "Absage fehlgeschlagen." };

  await dispatchNotification(supabase, {
    type: "registration",
    title: "Anmeldung storniert",
    body: "Deine Anmeldung wurde storniert.",
    payload: {
      participant_id: participantId,
      status: "cancelled",
    },
    recipientUserId: reg.child_profile_id ? null : user.id,
    recipientChildId: reg.child_profile_id ?? null,
    relatedTourId: reg.tour_id,
    relatedGroupId: null,
  });

  const freesCapacity = reg.status === "confirmed" || reg.status === "pending";
  if (freesCapacity) {
    await promoteWaitlistParticipants({
      supabase,
      tourId: reg.tour_id,
    });
  }

  // Cancel associated material reservations & restore inventory
  const childProfileMatch = reg.child_profile_id
    ? `child_profile_id.eq.${reg.child_profile_id}`
    : `child_profile_id.is.null`;

  const { data: resItems } = await supabase
    .from("material_reservations")
    .select("id, material_inventory_id, status")
    .match({ tour_id: reg.tour_id, user_id: user.id })
    .or(childProfileMatch)
    .neq("status", "cancelled");

  if (resItems && resItems.length > 0) {
    for (const resItem of resItems) {
      // Bestand nur zurückgeben, wenn die Anfrage bereits reserviert/ausgegeben wurde.
      if (resItem.status === "reserved" || resItem.status === "on loan") {
        const { data: inv } = await supabase
          .from("material_inventory")
          .select("quantity_available")
          .eq("id", resItem.material_inventory_id)
          .single();

        if (inv) {
          await supabase
            .from("material_inventory")
            .update({ quantity_available: inv.quantity_available + 1 })
            .eq("id", resItem.material_inventory_id);
        }
      }

      // Update reservation status
      await supabase
        .from("material_reservations")
        .update({ status: "cancelled" })
        .eq("id", resItem.id);
    }
  }

  const tourId = reg.tour_id;

  // If the tour was full & status was confirmed, open it up again
  const { data: tour } = await supabase
    .from("tours")
    .select("max_participants, status, title, group")
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
      if (tour.group && tour.title) {
        await notifyTourOpenForSubscribers(supabase, {
          tourId,
          title: tour.title,
          groupId: tour.group,
        });
      }
    }
  }

  revalidatePath(`/touren/${tourId}`);
  return { success: true };
}
