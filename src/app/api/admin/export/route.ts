import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";

type Nullable<T> = T | null;

type ExportTourGuideRelation = {
  profiles:
    | { full_name: Nullable<string> }
    | { full_name: Nullable<string> }[]
    | null;
};

type ExportTourMaterialRelation = {
  material_types:
    | { name: Nullable<string> }
    | { name: Nullable<string> }[]
    | null;
};

type ExportTourResourceRelation = {
  resources: { name: Nullable<string> } | { name: Nullable<string> }[] | null;
};

type ExportTour = {
  title: string;
  description: Nullable<string>;
  start_date: string;
  end_date: Nullable<string>;
  difficulty: Nullable<string>;
  target_area: Nullable<string>;
  requirements: Nullable<string>;
  meeting_point: Nullable<string>;
  meeting_time: Nullable<string>;
  elevation: Nullable<number>;
  distance: Nullable<number>;
  duration_hours: Nullable<number>;
  cost_info: Nullable<string>;
  max_participants: Nullable<number>;
  min_age: Nullable<number>;
  status: Nullable<string>;
  tour_groups:
    | { group_name: Nullable<string> }
    | { group_name: Nullable<string> }[]
    | null;
  tour_categorys:
    | { category: Nullable<string> }
    | { category: Nullable<string> }[]
    | null;
  tour_guides: ExportTourGuideRelation[] | null;
  tour_material_requirements: ExportTourMaterialRelation[] | null;
  resource_bookings: ExportTourResourceRelation[] | null;
};

type ExportParticipantProfile = {
  title: string;
  full_name: Nullable<string>;
  birthdate: Nullable<string>;
  membership_number: Nullable<string>;
};

type ExportParticipantChildProfile = {
  full_name: Nullable<string>;
  birthdate: Nullable<string>;
};

type ExportParticipant = {
  status: Nullable<string>;
  tours:
    | {
        title: Nullable<string>;
        tour_groups:
          | { group_name: Nullable<string> }
          | { group_name: Nullable<string> }[]
          | null;
      }
    | {
        title: Nullable<string>;
        tour_groups:
          | { group_name: Nullable<string> }
          | { group_name: Nullable<string> }[]
          | null;
      }[]
    | null;
  profiles: ExportParticipantProfile | ExportParticipantProfile[] | null;
  child_profiles:
    | ExportParticipantChildProfile
    | ExportParticipantChildProfile[]
    | null;
};

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toCsvCell(value: unknown): string {
  return `"${String(value ?? "")
    .replace(/"/g, '""')
    .replace(/\n/g, " ")}"`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("de-DE").format(parsed);
}

function getTargetYearFromType(type: string): number {
  const isNextYear = type.endsWith("next");
  return new Date().getFullYear() + (isNextYear ? 1 : 0);
}

async function exportTours(targetYear: number): Promise<NextResponse> {
  const supabase = await createClient();

  const { data: tours, error } = await supabase
    .from("tours")
    .select(`
      title, description, start_date, end_date, difficulty, target_area,
      requirements, meeting_point, meeting_time, elevation, distance,
      duration_hours, cost_info, max_participants, min_age, status,
      tour_groups!tours_group_fkey ( group_name ),
      tour_categorys!tours_category_fkey ( category ),
      tour_guides (
        profiles ( full_name )
      ),
      tour_material_requirements (
        material_types ( name )
      ),
      resource_bookings (
        resources ( name )
      )
    `)
    .gte("start_date", `${targetYear}-01-01`)
    .lt("start_date", `${targetYear + 1}-01-01`)
    .in("status", ["planning", "open", "full"])
    .order("start_date", { ascending: true });

  if (error) {
    console.error("Export Error (Tours):", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }

  const header = [
    "Tour",
    "Tourengruppe",
    "Kategorie",
    "Status",
    "Startdatum",
    "Enddatum",
    "Treffpunktzeit",
    "Treffpunkt",
    "Schwierigkeit",
    "Zielgebiet",
    "Hoehenmeter",
    "Strecke-km",
    "Dauer-Stunden",
    "Mindestalter",
    "Max. Teilnehmer",
    "Guides",
    "Benoetigte Ressourcen",
    "Benoetigtes Material",
    "Voraussetzungen",
    "Kostenhinweis",
    "Beschreibung",
  ]
    .map((h) => toCsvCell(h))
    .join(",");

  const rows = ((tours ?? []) as ExportTour[]).map((tour) => {
    const tourGroup = firstOrNull(tour.tour_groups);
    const tourCategory = firstOrNull(tour.tour_categorys);

    const guideNames = (tour.tour_guides ?? [])
      .map((relation) => firstOrNull(relation.profiles)?.full_name)
      .filter((name): name is string => Boolean(name));

    const materialNames = (tour.tour_material_requirements ?? [])
      .map((relation) => firstOrNull(relation.material_types)?.name)
      .filter((name): name is string => Boolean(name));

    const resourceNames = (tour.resource_bookings ?? [])
      .map((relation) => firstOrNull(relation.resources)?.name)
      .filter((name): name is string => Boolean(name));

    const uniqueGuides = Array.from(new Set(guideNames));
    const uniqueMaterials = Array.from(new Set(materialNames));
    const uniqueResources = Array.from(new Set(resourceNames));

    return [
      tour.title,
      tourGroup?.group_name || "",
      tourCategory?.category || "",
      tour.status,
      formatDate(tour.start_date),
      formatDate(tour.end_date),
      tour.meeting_time,
      tour.meeting_point,
      tour.difficulty,
      tour.target_area,
      tour.elevation,
      tour.distance,
      tour.duration_hours,
      tour.min_age,
      tour.max_participants,
      uniqueGuides.join(" | "),
      uniqueResources.join(" | "),
      uniqueMaterials.join(" | "),
      tour.requirements,
      tour.cost_info,
      tour.description,
    ]
      .map((value) => toCsvCell(value))
      .join(",");
  });

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="touren_geplant_${targetYear}.csv"`,
    },
  });
}

async function exportParticipants(targetYear: number): Promise<NextResponse> {
  const supabase = await createClient();

  const { data: participants, error } = await supabase
    .from("tour_participants")
    .select(`
      status,
      tours!tour_participants_tour_id_fkey (
        title,
        tour_groups!tours_group_fkey ( group_name )
      ),
      profiles!tour_participants_user_id_fkey (
        full_name,
        birthdate,
        membership_number
      ),
      child_profiles (
        full_name,
        birthdate
      )
    `)
    .gte("tours.start_date", `${targetYear}-01-01`)
    .lt("tours.start_date", `${targetYear + 1}-01-01`)
    .in("tours.status", ["planning", "open", "full"])
    .in("status", ["pending", "confirmed", "waitlist"])
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Export Error (Participants):", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }

  const header = [
    "Tour",
    "Tourengruppe",
    "Teilnehmer",
    "Geburtsdatum",
    "Mitgliedsnummer",
  ]
    .map((h) => toCsvCell(h))
    .join(",");

  const rows = ((participants ?? []) as ExportParticipant[]).map(
    (participant) => {
      const tour = firstOrNull(participant.tours);
      const tourGroup = firstOrNull(tour?.tour_groups);
      const profile = firstOrNull(participant.profiles);
      const childProfile = firstOrNull(participant.child_profiles);

      return [
        tour?.title || "",
        tourGroup?.group_name || "",
        profile?.full_name || childProfile?.full_name || "Unbekannt",
        formatDate(profile?.birthdate || childProfile?.birthdate || ""),
        profile?.membership_number || "",
      ]
        .map((value) => toCsvCell(value))
        .join(",");
    },
  );

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="teilnehmer_${targetYear}.csv"`,
    },
  });
}

export async function GET(request: Request) {
  try {
    const profile = await getCurrentUserProfile();

    if (!profile || profile.role !== "admin") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (
      !type ||
      (!type.startsWith("tours-") && !type.startsWith("participants-"))
    ) {
      return new NextResponse("Bad Request", { status: 400 });
    }

    const targetYear = getTargetYearFromType(type);

    if (type.startsWith("tours-")) {
      return await exportTours(targetYear);
    }

    return await exportParticipants(targetYear);
  } catch (error) {
    console.error("Unexpected export handler error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
