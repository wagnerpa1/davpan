"use server";

import { revalidatePath } from "next/cache";
import { canManageMaterial, isGuideRole } from "@/lib/auth";
import { buildIdempotencyKey } from "@/lib/idempotency";
import { dispatchNotification } from "@/lib/notifications/dispatcher";
import { createClient } from "@/utils/supabase/server";

const ALLOWED_STATUS = new Set([
  "requested",
  "reserved",
  "on loan",
  "returned",
  "cancelled",
]);

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  requested: ["reserved", "cancelled"],
  reserved: ["on loan", "cancelled"],
  "on loan": ["returned", "cancelled"],
  returned: [],
  cancelled: [],
};

async function applyMaterialTransitionRpc(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reservationId: string,
  expectedStatus: string,
  newStatus: string,
  idempotencyScope: string,
) {
  const idempotencyKey = buildIdempotencyKey(idempotencyScope, [
    reservationId,
    expectedStatus,
    newStatus,
  ]);

  const withIdempotency = await supabase.rpc(
    "apply_material_reservation_transition_atomic",
    {
      p_reservation_id: reservationId,
      p_expected_status: expectedStatus,
      p_new_status: newStatus,
      p_idempotency_key: idempotencyKey,
    },
  );

  const error = withIdempotency.error;
  if (!error) {
    return { error: null };
  }

  const mightBeLegacySignature =
    error.code === "PGRST202" ||
    error.code === "42883" ||
    error.message?.includes("apply_material_reservation_transition_atomic") ||
    error.message?.includes("function") ||
    error.details?.includes("function");

  if (!mightBeLegacySignature) {
    return { error };
  }

  const withoutIdempotency = await supabase.rpc(
    "apply_material_reservation_transition_atomic",
    {
      p_reservation_id: reservationId,
      p_expected_status: expectedStatus,
      p_new_status: newStatus,
    },
  );

  return { error: withoutIdempotency.error };
}

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

  if (!ALLOWED_STATUS.has(newStatus)) {
    return { error: "Ungültiger Status." };
  }

  if (!canManageMaterial(profile?.role) && !isGuideRole(profile?.role)) {
    return { error: "Keine Berechtigung." };
  }

  const { data: reservation, error: reservationError } = await supabase
    .from("material_reservations")
    .select(
      "id, status, tour_id, material_inventory_id, user_id, child_profile_id",
    )
    .eq("id", id)
    .single();

  if (reservationError || !reservation) {
    return { error: "Reservierung nicht gefunden." };
  }

  const currentStatus = reservation.status || "requested";
  if (currentStatus === newStatus) {
    return { success: true };
  }

  if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus)) {
    return {
      error: `Übergang von "${currentStatus}" nach "${newStatus}" ist nicht erlaubt.`,
    };
  }

  if (isGuideRole(profile?.role)) {
    if (!reservation.tour_id) {
      return { error: "Guides dürfen private Ausleihen nicht verwalten." };
    }

    const { data: guideAssignment } = await supabase
      .from("tour_guides")
      .select("id")
      .eq("tour_id", reservation.tour_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!guideAssignment) {
      return { error: "Keine Berechtigung für diese Tour-Reservierung." };
    }
  }

  const { error: rpcError } = await applyMaterialTransitionRpc(
    supabase,
    id,
    currentStatus,
    newStatus,
    "material-status",
  );

  if (rpcError) {
    if (rpcError.code === "08000") {
      if (currentStatus === "requested" && newStatus === "reserved") {
        if (reservation.user_id || reservation.child_profile_id) {
          await dispatchNotification(supabase, {
            type: "material",
            title: "Materialreservierung nicht möglich",
            body: "Die Reservierung konnte nicht bestätigt werden, weil aktuell kein Bestand verfügbar ist.",
            payload: {
              reservation_id: id,
              old_status: currentStatus,
              new_status: "cancelled",
              status: "failed",
            },
            recipientUserId: reservation.child_profile_id
              ? null
              : reservation.user_id,
            recipientChildId: reservation.child_profile_id,
            relatedTourId: reservation.tour_id,
            relatedGroupId: null,
          });
        }
      }

      return { error: "Nicht genügend Bestand verfügbar." };
    }

    if (rpcError.code === "40001") {
      return {
        error:
          "Die Reservierung wurde parallel geändert. Bitte Ansicht aktualisieren und erneut versuchen.",
      };
    }

    console.error("RPC update reservation error:", rpcError);
    return { error: "Fehler beim Aktualisieren des Status." };
  }

  let relatedGroupId: string | null = null;
  let relatedTourTitle: string | null = null;
  if (reservation.tour_id) {
    const { data: tourInfo } = await supabase
      .from("tours")
      .select("group, title")
      .eq("id", reservation.tour_id)
      .maybeSingle();

    relatedGroupId = tourInfo?.group ?? null;
    relatedTourTitle = tourInfo?.title ?? null;
  }

  if (
    (newStatus === "reserved" || newStatus === "cancelled") &&
    (reservation.user_id || reservation.child_profile_id)
  ) {
    const title =
      newStatus === "reserved"
        ? "Materialreservierung bestätigt"
        : "Materialreservierung abgelehnt";

    await dispatchNotification(supabase, {
      type: "material",
      title,
      body: relatedTourTitle
        ? `Deine Materialreservierung für "${relatedTourTitle}" wurde ${newStatus === "reserved" ? "bestätigt" : "abgelehnt"}.`
        : `Deine Materialreservierung wurde ${newStatus === "reserved" ? "bestätigt" : "abgelehnt"}.`,
      payload: {
        reservation_id: id,
        old_status: currentStatus,
        new_status: newStatus,
      },
      recipientUserId: reservation.child_profile_id
        ? null
        : reservation.user_id,
      recipientChildId: reservation.child_profile_id,
      relatedTourId: reservation.tour_id,
      relatedGroupId,
    });
  }

  revalidatePath("/admin/material/reservations");
  if (reservation.tour_id) {
    revalidatePath(`/touren/${reservation.tour_id}`);
  }
  return { success: true };
}
export async function bulkUpdateTourReservations(
  tourId: string,
  currentStatus: string,
  newStatus: string,
) {
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

  if (!canManageMaterial(profile?.role) && !isGuideRole(profile?.role)) {
    return { error: "Keine Berechtigung." };
  }

  if (!ALLOWED_STATUS.has(currentStatus) || !ALLOWED_STATUS.has(newStatus)) {
    return { error: "Ungültiger Status für Stapelverarbeitung." };
  }

  if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus)) {
    return {
      error: `Übergang von "${currentStatus}" nach "${newStatus}" ist nicht erlaubt.`,
    };
  }

  if (isGuideRole(profile?.role)) {
    const { data: guideAssignment } = await supabase
      .from("tour_guides")
      .select("id")
      .eq("tour_id", tourId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!guideAssignment) {
      return { error: "Keine Berechtigung fuer diese Tour." };
    }
  }

  // Fetch all reservations for this tour with current status
  const { data: reservations, error: fetchErr } = await supabase
    .from("material_reservations")
    .select("id, status")
    .eq("tour_id", tourId)
    .eq("status", currentStatus);

  if (fetchErr || !reservations) {
    return { error: "Fehler beim Laden der Reservierungen." };
  }

  if (reservations.length === 0) {
    return { success: true, count: 0 };
  }

  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const res of reservations) {
    const expectedStatus = res.status || currentStatus;
    const { error: rpcError } = await applyMaterialTransitionRpc(
      supabase,
      res.id,
      expectedStatus,
      newStatus,
      "bulk-material-status",
    );

    if (!rpcError) {
      successCount++;
      continue;
    }

    failedCount++;
    if (errors.length < 5) {
      if (rpcError.code === "08000") {
        errors.push("Nicht genügend Bestand verfügbar.");
      } else if (rpcError.code === "40001") {
        errors.push("Paralleländerung erkannt. Bitte erneut versuchen.");
      } else {
        errors.push(
          rpcError.message || "Unbekannter Fehler bei Statuswechsel.",
        );
      }
    }
  }

  revalidatePath("/admin/material/reservations");
  revalidatePath(`/touren/${tourId}`);
  revalidatePath("/guide/dashboard");

  return {
    success: failedCount === 0,
    count: successCount,
    failedCount,
    errors,
  };
}
