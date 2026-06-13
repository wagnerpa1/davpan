import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
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

type ExportTourSummary = {
  id: string;
  title: string;
  group: Nullable<string>;
};

type ExportTourGroupSummary = {
  id: string;
  group_name: Nullable<string>;
};

type ExportParticipantProfile = {
  id: string;
  full_name: Nullable<string>;
  birthdate: Nullable<string>;
  membership_number: Nullable<string>;
};

type ExportChildProfile = {
  id: string;
  full_name: Nullable<string>;
  birthdate: Nullable<string>;
};

type ExportParticipantRow = {
  status: Nullable<string>;
  tour_id: string | null;
  user_id: string | null;
  child_profile_id: string | null;
  created_at: string | null;
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

  return new Intl.DateTimeFormat("de-DE", { timeZone: "UTC" }).format(parsed);
}

function createCsvResponse(csv: string, filename: string): NextResponse {
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      Pragma: "no-cache",
    },
  });
}

function getTargetYearFromType(type: string): number {
  const isNextYear = type.endsWith("next");
  return new Date().getFullYear() + (isNextYear ? 1 : 0);
}

function getYearRange(targetYear: number) {
  return {
    start: `${targetYear}-01-01`,
    end: `${targetYear + 1}-01-01`,
  };
}

function getUniqueIds(values: Array<string | null>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

async function exportTours(targetYear: number): Promise<NextResponse> {
  const supabase = await createClient();
  const { start, end } = getYearRange(targetYear);

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
    .gte("start_date", start)
    .lt("start_date", end)
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
    "Höhenmeter",
    "Strecke-km",
    "Dauer-Stunden",
    "Mindestalter",
    "Max. Teilnehmer",
    "Guides",
    "Benötigte Ressourcen",
    "Benötigtes Material",
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

  return createCsvResponse(csv, `touren_geplant_${targetYear}.csv`);
}

async function exportParticipants(targetYear: number): Promise<NextResponse> {
  const supabase = await createClient();
  const { start, end } = getYearRange(targetYear);

  const { data: toursInYear, error: toursError } = await supabase
    .from("tours")
    .select("id, title, group")
    .gte("start_date", start)
    .lt("start_date", end)
    .order("start_date", { ascending: true });

  if (toursError) {
    console.error("Export Error (Participants - Tours):", toursError);
    return new NextResponse("Internal Server Error", { status: 500 });
  }

  const tourRows = (toursInYear ?? []) as ExportTourSummary[];
  const tourIds = tourRows.map((tour) => tour.id);

  const participantResult = tourIds.length
    ? await supabase
        .from("tour_participants")
        .select("status, tour_id, user_id, child_profile_id, created_at")
        .in("tour_id", tourIds)
        .in("status", ["pending", "confirmed", "waitlist"])
        .order("created_at", { ascending: true })
    : {
        data: [] as ExportParticipantRow[],
        error: null as { message: string } | null,
      };

  if (participantResult.error) {
    console.error("Export Error (Participants):", participantResult.error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }

  const participantRows = (participantResult.data ??
    []) as ExportParticipantRow[];
  const profileIds = getUniqueIds(
    participantRows.map((participant) => participant.user_id),
  );
  const childProfileIds = getUniqueIds(
    participantRows.map((participant) => participant.child_profile_id),
  );
  const groupIds = getUniqueIds(tourRows.map((tour) => tour.group));

  let profiles: ExportParticipantProfile[] = [];
  if (profileIds.length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, birthdate, membership_number")
      .in("id", profileIds);

    if (error) {
      console.error("Export Error (Participants - Profiles):", error);
      return new NextResponse("Internal Server Error", { status: 500 });
    }

    profiles = (data ?? []) as ExportParticipantProfile[];
  }

  let childProfiles: ExportChildProfile[] = [];
  if (childProfileIds.length > 0) {
    const { data, error } = await supabase
      .from("child_profiles")
      .select("id, full_name, birthdate")
      .in("id", childProfileIds);

    if (error) {
      console.error("Export Error (Participants - Child Profiles):", error);
      return new NextResponse("Internal Server Error", { status: 500 });
    }

    childProfiles = (data ?? []) as ExportChildProfile[];
  }

  let groups: ExportTourGroupSummary[] = [];
  if (groupIds.length > 0) {
    const { data, error } = await supabase
      .from("tour_groups")
      .select("id, group_name")
      .in("id", groupIds);

    if (error) {
      console.error("Export Error (Participants - Groups):", error);
      return new NextResponse("Internal Server Error", { status: 500 });
    }

    groups = (data ?? []) as ExportTourGroupSummary[];
  }

  const tourById = new Map<string, ExportTourSummary>(
    tourRows.map((tour) => [tour.id, tour]),
  );
  const groupById = new Map<string, ExportTourGroupSummary>(
    groups.map((group) => [group.id, group]),
  );
  const profileById = new Map<string, ExportParticipantProfile>(
    profiles.map((profile) => [profile.id, profile]),
  );
  const childProfileById = new Map<string, ExportChildProfile>(
    childProfiles.map((profile) => [profile.id, profile]),
  );

  const header = [
    "Tour",
    "Tourengruppe",
    "Teilnehmer",
    "Geburtsdatum",
    "Mitgliedsnummer",
  ]
    .map((h) => toCsvCell(h))
    .join(",");

  const rows = participantRows.map((participant) => {
    const tour = participant.tour_id ? tourById.get(participant.tour_id) : null;
    const tourGroup = tour?.group ? groupById.get(tour.group) : null;
    const profile = participant.user_id
      ? profileById.get(participant.user_id)
      : null;
    const childProfile = participant.child_profile_id
      ? childProfileById.get(participant.child_profile_id)
      : null;

    return [
      tour?.title || "",
      tourGroup?.group_name || "",
      profile?.full_name || childProfile?.full_name || "Unbekannt",
      formatDate(profile?.birthdate || childProfile?.birthdate || ""),
      profile?.membership_number || "",
    ]
      .map((value) => toCsvCell(value))
      .join(",");
  });

  const csv = [header, ...rows].join("\n");

  return createCsvResponse(csv, `teilnehmer_${targetYear}.csv`);
}

export async function GET(request: Request) {
  try {
    const profile = await getCurrentUserProfile();

    if (!profile || !isAdminRole(profile.role)) {
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
