import type { SupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import {
  calculateAge,
  normalizeMembershipNumber,
} from "@/lib/membership-utils";
import { isSameOriginRequest } from "@/lib/security";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json(
      { error: "CSRF-Validierung fehlgeschlagen" },
      { status: 403 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  let body: { member_number?: string; birth_date?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges JSON-Format" },
      { status: 400 },
    );
  }

  const rawNumber = body.member_number?.trim();
  const birthdate = body.birth_date?.trim();

  if (!rawNumber || !birthdate) {
    return NextResponse.json(
      { error: "Mitgliedsnummer und Geburtsdatum sind erforderlich." },
      { status: 400 },
    );
  }

  const { digits, formatted } = normalizeMembershipNumber(rawNumber);
  const age = calculateAge(birthdate);

  if (age >= 18) {
    return NextResponse.json(
      {
        error:
          "Volljährige Mitglieder (ab 18 Jahren) können nicht als Kind verknüpft werden.",
      },
      { status: 400 },
    );
  }

  const adminClient: SupabaseClient = (createAdminClient() ??
    supabase) as unknown as SupabaseClient;

  // Prevent parent from linking their own membership number
  const { data: parentProfile } = await supabase
    .from("profiles")
    .select("membership_number")
    .eq("id", user.id)
    .single();

  if (
    parentProfile?.membership_number &&
    (parentProfile.membership_number === digits ||
      parentProfile.membership_number === formatted ||
      parentProfile.membership_number === rawNumber)
  ) {
    return NextResponse.json(
      {
        error:
          "Du kannst deine eigene Mitgliedsnummer nicht als Kind verknüpfen.",
      },
      { status: 400 },
    );
  }

  // Lookup in section_members
  const { data: memberRecord, error: memberError } = await adminClient
    .from("section_members")
    .select("membership_number, first_name, last_name, birthdate, is_active")
    .or(
      `membership_number.eq.${digits},membership_number.eq.${formatted},membership_number.eq.${rawNumber}`,
    )
    .eq("birthdate", birthdate)
    .maybeSingle();

  if (memberError || !memberRecord) {
    return NextResponse.json(
      {
        error:
          "Mitgliedsdaten nicht gefunden oder Geburtsdatum stimmt nicht überein.",
      },
      { status: 404 },
    );
  }

  if (!memberRecord.is_active) {
    return NextResponse.json(
      { error: "Die Mitgliedschaft des Kindes ist inaktiv." },
      { status: 400 },
    );
  }

  const fullName =
    `${memberRecord.first_name} ${memberRecord.last_name}`.trim();

  // Find or create child_profiles record
  let childId: string;
  const { data: existingChild } = await adminClient
    .from("child_profiles")
    .select("id")
    .or(
      `membership_number.eq.${digits},membership_number.eq.${formatted},membership_number.eq.${memberRecord.membership_number}`,
    )
    .maybeSingle();

  if (existingChild) {
    childId = existingChild.id;
    await adminClient
      .from("child_profiles")
      .update({
        full_name: fullName,
        birthdate,
        membership_number: memberRecord.membership_number,
        is_active: true,
      })
      .eq("id", childId);
  } else {
    const { data: newChild, error: createError } = await adminClient
      .from("child_profiles")
      .insert({
        parent_id: user.id,
        full_name: fullName,
        birthdate,
        membership_number: memberRecord.membership_number,
        is_active: true,
      })
      .select("id")
      .single();

    if (createError || !newChild) {
      return NextResponse.json(
        { error: "Fehler beim Erstellen des Kind-Profils" },
        { status: 500 },
      );
    }
    childId = newChild.id;
  }

  // Check if relation already exists
  const { data: existingRelation } = await adminClient
    .from("parent_child_relations")
    .select("child_id")
    .eq("parent_id", user.id)
    .eq("child_id", childId)
    .maybeSingle();

  if (existingRelation) {
    return NextResponse.json(
      { error: "Dieses Kind ist bereits mit deinem Konto verknüpft." },
      { status: 409 },
    );
  }

  const { error: insertRelationError } = await adminClient
    .from("parent_child_relations")
    .insert({
      parent_id: user.id,
      child_id: childId,
    });

  if (insertRelationError) {
    return NextResponse.json(
      { error: "Fehler beim Verknüpfen des Kindes" },
      { status: 500 },
    );
  }

  await adminClient.rpc("recalculate_user_parent_status", {
    p_user_id: user.id,
  });

  return NextResponse.json({
    success: true,
    child: {
      id: childId,
      full_name: fullName,
      birthdate,
      membership_number: memberRecord.membership_number,
    },
  });
}
