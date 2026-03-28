import { format } from "date-fns";
import { Calendar, Clock, MapPin, Mountain, Ruler } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

interface PublicTourDetail {
  id: string;
  title: string;
  description: string | null;
  target_area: string | null;
  difficulty: string | null;
  elevation: number | null;
  distance: number | null;
  duration_hours: number | null;
  meeting_point: string | null;
  meeting_time: string | null;
  start_date: string | null;
  end_date: string | null;
  tour_categorys?: { category: string | null } | null;
}

export default async function PublicTourDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tours")
    .select(
      "id, title, description, target_area, difficulty, elevation, distance, duration_hours, meeting_point, meeting_time, start_date, end_date, tour_categorys!tours_category_fkey(category)",
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const tour = {
    ...data,
    tour_categorys: Array.isArray(data.tour_categorys)
      ? data.tour_categorys[0]
      : data.tour_categorys,
  } as PublicTourDetail;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/oeffentlich/touren"
          className="text-sm text-slate-500 hover:text-jdav-green"
        >
          &larr; Zurück zu den öffentlichen Touren
        </Link>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-4 flex flex-wrap gap-2">
          {tour.tour_categorys?.category && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-slate-700">
              {tour.tour_categorys.category}
            </span>
          )}
          {tour.difficulty && (
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
              {tour.difficulty}
            </span>
          )}
        </div>

        <h1 className="text-3xl font-black text-slate-900">{tour.title}</h1>

        <p className="mt-4 text-slate-700">
          {tour.description || "Beschreibung folgt."}
        </p>

        <div className="mt-6 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-jdav-green" />
            <span>
              {tour.start_date
                ? tour.end_date && tour.start_date !== tour.end_date
                  ? `${format(new Date(tour.start_date), "dd.MM.")} - ${format(new Date(tour.end_date), "dd.MM.yyyy")}`
                  : format(new Date(tour.start_date), "dd.MM.yyyy")
                : "Termin folgt"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-jdav-green" />
            <span>{tour.target_area || "Zielgebiet folgt"}</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-jdav-green" />
            <span>{tour.meeting_time || "Treffpunktzeit folgt"}</span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-jdav-green" />
            <span>{tour.meeting_point || "Park-and-Ride Parkplatz"}</span>
          </div>

          <div className="flex items-center gap-2">
            <Mountain className="h-4 w-4 text-jdav-green" />
            <span>{tour.elevation ?? "-"} Hm</span>
          </div>

          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-jdav-green" />
            <span>{tour.distance ?? "-"} km</span>
          </div>
        </div>
      </div>
    </div>
  );
}
