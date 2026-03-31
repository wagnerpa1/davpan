"use server";

import { revalidatePath } from "next/cache";
import { buildIdempotencyKey } from "@/lib/idempotency";
import {
  dispatchNotification,
  dispatchToUsers,
} from "@/lib/notifications/dispatcher";
import {
  notifyTourOpenForSubscribers,
  resolveMaterialManagerUserIds,
  resolveTourManagerUserIds,
} from "@/lib/notifications/targets";
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
  const clientRequestIdRaw = formData.get("clientRequestId");
  const clientRequestId =
    typeof clientRequestIdRaw === "string" &&
    clientRequestIdRaw.trim().length > 0
      ? clientRequestIdRaw.trim()
      : "";
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
        return { error: "Ung�ltiges Kind-Profil." };
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
        // Registrierung bleibt bewusst m�glich (Guide kann Ausnahme manuell pr�fen/best�tigen).
      }

      // We allow the registration even if too young, but it will be pending/waitlisted
      // The frontend shows a warning. The Guide decides eventually.
    }
  }

  try {
    // 2. Prepare materials as JSONB for RPC
    let materialsJsonb = null;
    if (materials.length > 0) {
      // Query material inventory to get IDs by type+size
      const { data: inventoryItems } = await supabase
        .from("material_inventory")
        .select("id, material_type_id, size")
        .in(
          "material_type_id",
          materials.map((m) => m.material_type_id),
        );

      const materialReqs = materials
        .map((m) => {
          const invItem = inventoryItems?.find(
            (inv) =>
              inv.material_type_id === m.material_type_id &&
              inv.size === m.size,
          );
          return invItem
            ? {
                material_inventory_id: invItem.id,
                quantity: 1,
              }
            : null;
        })
        .filter(Boolean);

      if (materialReqs.length > 0) {
        materialsJsonb = JSON.stringify(materialReqs);
      }
    }

    // 3. Call atomic RPC (replaces steps 2-5 above)
    const normalizedChildId = childId && childId !== "self" ? childId : "self";
    const idempotencyKey = buildIdempotencyKey("tour-registration", [
      user.id,
      tourId,
      normalizedChildId,
      materialsJsonb || "",
      clientRequestId,
    ]);

    const { data: result, error: rpcError } = await supabase.rpc(
      "register_for_tour_atomic",
      {
        p_tour_id: tourId,
        p_user_id: user.id,
        p_child_id: normalizedChildId !== "self" ? normalizedChildId : null,
        p_materials: materialsJsonb,
        p_idempotency_key: idempotencyKey,
      },
    );

    if (rpcError) {
      const errorMsg = rpcError.message || "Anmeldung fehlgeschlagen";

      // Handle specific error cases
      if (
        rpcError.code === "23505" ||
        errorMsg.includes("Already registered")
      ) {
        return { error: "F�r diese Tour bereits angemeldet." };
      }

      if (errorMsg.includes("Material not available")) {
        await dispatchNotification(supabase, {
          type: "material",
          title: "Materialreservierung nicht m�glich",
          body: `Die Materialreservierung f�r "${tour.title}" konnte nicht abgeschlossen werden.`,
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
          error: "Material ist leider nicht mehr verf�gbar.",
        };
      }

      console.error("RPC Error:", rpcError);
      return { error: errorMsg };
    }

    const status = result.status;
    const waitlistPosition = result.waitlist_position;
    const isIdempotencyReplay = Boolean(result.idempotency_replayed);

    if (!isIdempotencyReplay) {
      // Teilnehmer bei Anmeldung NICHT benachrichtigen; nur Verantwortliche informieren.
      const managerIds = await resolveTourManagerUserIds(
        supabase,
        tourId,
        tour.created_by ?? null,
      );

      await dispatchToUsers(supabase, managerIds, {
        type: status === "waitlist" ? "waitlist" : "registration",
        title:
          status === "waitlist"
            ? "Neue Wartelisten-Anmeldung"
            : "Neue Tour-Anmeldung",
        body:
          status === "waitlist"
            ? `${actorDisplayName} steht jetzt auf der Warteliste f�r "${tour.title}".`
            : `${actorDisplayName} hat sich f�r "${tour.title}" angemeldet (pending).`,
        payload: {
          tour_id: tourId,
          status,
          url: `/touren/${tourId}`,
        },
        relatedTourId: tourId,
        relatedGroupId: tour.group,
      });

      if (materials.length > 0) {
        const materialManagerIds =
          await resolveMaterialManagerUserIds(supabase);
        await dispatchToUsers(supabase, materialManagerIds, {
          type: "material",
          title: "Neue Materialreservierung",
          body: `${actorDisplayName} hat Material f�r "${tour.title}" angefragt.`,
          payload: {
            tour_id: tourId,
            status,
            url: "/admin/material/reservations",
          },
          relatedTourId: tourId,
          relatedGroupId: tour.group,
        });
      }
    }

    revalidatePath(`/touren/${tourId}`);
    return {
      success: true,
      status: status,
      message:
        status === "waitlist"
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

  // Fetch tour info for notifications
  const { data: tourData } = await supabase
    .from("tours")
    .select("title, group")
    .eq("id", reg.tour_id)
    .single();

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
    // Use new atomic RPC for promotion (single source of truth)
    const { data: promoted, error: promoteError } = await supabase.rpc(
      "promote_first_waitlist",
      { p_tour_id: reg.tour_id },
    );

    if (promoted?.promoted_count > 0 && !promoteError) {
      // Single notification (RPC handles the promotion, app handles the notification)

      // Only notify the promoted participant (not guides, they get it from sync_tour_status)
      await dispatchNotification(supabase, {
        type: "waitlist",
        title: "Du bist nachger�ckt",
        body: `F�r "${tourData?.title || "die Tour"}" ist ein Platz frei geworden. Du bist jetzt best�tigt.`,
        payload: {
          tour_id: reg.tour_id,
          participant_id: promoted.promoted_user_id,
          status: "confirmed",
          url: `/touren/${reg.tour_id}`,
        },
        recipientUserId: promoted.promoted_child_id
          ? null
          : promoted.promoted_user_id,
        recipientChildId: promoted.promoted_child_id,
        relatedTourId: reg.tour_id,
        relatedGroupId: null,
      });
    }
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
      // Bestand nur zur�ckgeben, wenn die Anfrage bereits reserviert/ausgegeben wurde.
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

export async function confirmWaitlistSpot(
  participantId: string,
  tourId: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, error: "Nicht authentifiziert" };
  }

  const { error } = await supabase.rpc("confirm_waitlist_promotion", {
    p_participant_id: participantId,
  });

  if (error) {
    console.error("Waitlist confirm error:", error);
    return {
      success: false,
      error: "Best�tigung fehlgeschlagen. Evtl. ist die 24h-Frist abgelaufen.",
    };
  }

  revalidatePath(`/touren/${tourId}`);
  return { success: true };
}

export async function updateParticipantMaterials(
  tourId: string,
  childId: string | null,
  materials: { material_inventory_id: string; quantity: number }[],
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Nicht authentifiziert" };
  }

  const { error } = await supabase.rpc("update_my_tour_material", {
    p_tour_id: tourId,
    p_child_profile_id: childId,
    p_materials: materials,
  });

  if (error) {
    console.error("Material update error:", error);
    return {
      success: false,
      error:
        "Material konnte nicht aktualisiert werden. Eventuell ist die Frist abgelaufen oder der Bestand nicht ausreichend.",
    };
  }

  revalidatePath(`/touren/${tourId}`);
  return { success: true };
}
