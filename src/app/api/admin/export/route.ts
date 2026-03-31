import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";

type Nullable<T> = T | null;

type ExportProfile = {
  full_name: Nullable<string>;
  email: Nullable<string>;
  phone: Nullable<string>;
  emergency_phone: Nullable<string>;
  medical_notes: Nullable<string>;
};

type ExportChildProfile = {
  full_name: Nullable<string>;
};

type ExportGuideRelation = {
  profiles:
    | { full_name: Nullable<string> }
    | { full_name: Nullable<string> }[]
    | null;
};

type ExportParticipantRelation = {
  status: Nullable<string>;
  profiles: ExportProfile | ExportProfile[] | null;
  child_profiles: ExportChildProfile | ExportChildProfile[] | null;
};

type ExportTour = {
  id: string;
  title: string;
  category: Nullable<string>;
  start_date: string;
  end_date: Nullable<string>;
  tour_guides: ExportGuideRelation[] | null;
  tour_participants: ExportParticipantRelation[] | null;
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

export async function GET(request: Request) {
  const profile = await getCurrentUserProfile();

  if (!profile || profile.role !== "admin") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (!type || !type.startsWith("tours-")) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const isNextYear = type === "tours-next";
  const targetYear = new Date().getFullYear() + (isNextYear ? 1 : 0);

  const supabase = await createClient();

  const { data: tours, error: toursError } = await supabase
    .from("tours")
    .select(`
      id, title, category, start_date, end_date, difficulty,
      tour_guides (
        profiles ( full_name )
      ),
      tour_participants (
        id, status,
        profiles ( full_name, role, email, phone, emergency_phone, medical_notes ),
        child_profiles ( full_name )
      )
    `)
    .gte("start_date", `${targetYear}-01-01`)
    .lt("start_date", `${targetYear + 1}-01-01`)
    .in("status", ["planning", "open", "full"])
    .order("start_date", { ascending: true });

  if (toursError) {
    console.error("Export Error:", toursError);
    return new NextResponse("Internal Server Error", { status: 500 });
  }

  const header = [
    "Tour-ID",
    "Titel",
    "Kategorie",
    "Startdatum",
    "Enddatum",
    "Guides",
    "Teilnehmer Name",
    "Teilnehmer Status",
    "Email",
    "Telefon",
    "Notfallkontakt",
    "Medizinische Hinweise",
  ]
    .map((h) => toCsvCell(h))
    .join(",");

  const rows: string[] = [];

  for (const tour of (tours ?? []) as ExportTour[]) {
    const guideNames = (tour.tour_guides ?? [])
      .map((tg) => firstOrNull(tg.profiles)?.full_name)
      .filter((name): name is string => Boolean(name))
      .join(" & ");

    if (!tour.tour_participants || tour.tour_participants.length === 0) {
      rows.push(
        [
          tour.id,
          tour.title,
          tour.category,
          tour.start_date,
          tour.end_date,
          guideNames,
          "",
          "",
          "",
          "",
          "",
          "",
        ]
          .map((v) => toCsvCell(v))
          .join(","),
      );
    } else {
      for (const p of tour.tour_participants) {
        const profile = firstOrNull(p.profiles);
        const childProfile = firstOrNull(p.child_profiles);
        const participantName =
          profile?.full_name || childProfile?.full_name || "Unbekannt";
        const email = profile?.email || "";
        const phone = profile?.phone || "";
        const emergency = profile?.emergency_phone || "";
        const medical = profile?.medical_notes || "";

        rows.push(
          [
            tour.id,
            tour.title,
            tour.category,
            tour.start_date,
            tour.end_date,
            guideNames,
            participantName,
            p.status,
            email,
            phone,
            emergency,
            medical,
          ]
            .map((v) => toCsvCell(v))
            .join(","),
        );
      }
    }
  }

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="touren_export_${targetYear}.csv"`,
    },
  });
}
