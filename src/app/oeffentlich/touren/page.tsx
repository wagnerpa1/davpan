import { format } from "date-fns";
import { Calendar, MapPin } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

interface PublicTour {
  id: string;
  title: string;
  target_area: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  tour_categorys?: { category: string | null } | null;
}

export default async function PublicToursPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tours")
    .select(
      "id, title, target_area, start_date, end_date, status, tour_categorys!tours_category_fkey(category)",
    )
    .neq("status", "completed")
    .order("start_date", { ascending: true });

  const tours = (data || []).map((t) => ({
    ...t,
    tour_categorys: Array.isArray(t.tour_categorys)
      ? t.tour_categorys[0]
      : t.tour_categorys,
  })) as PublicTour[];

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-slate-900">
          Öffentliche Touren
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Überblick über kommende Touren der JDAV/DAV Sektion Pfarrkirchen.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Öffentliche Touren sind aktuell nicht verfügbar. Bitte später erneut
          versuchen.
        </div>
      )}

      <div className="space-y-3">
        {tours.length > 0 ? (
          tours.map((tour) => (
            <Link
              key={tour.id}
              href={`/oeffentlich/touren/${tour.id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-jdav-green hover:shadow-md"
            >
              <div className="mb-2 flex items-center gap-2">
                {tour.tour_categorys?.category && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-slate-700">
                    {tour.tour_categorys.category}
                  </span>
                )}
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                  {tour.status === "open"
                    ? "Anmeldung offen"
                    : tour.status === "full"
                      ? "Ausgebucht"
                      : tour.status === "planning"
                        ? "In Planung"
                        : tour.status}
                </span>
              </div>

              <h2 className="text-xl font-bold text-slate-900">{tour.title}</h2>

              <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
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
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-slate-200 border-dashed p-8 text-center text-slate-500">
            Aktuell sind keine öffentlichen Touren verfügbar.
          </div>
        )}
      </div>

      <div className="mt-6 text-center text-sm text-slate-500">
        <Link
          href="/login"
          className="font-medium text-jdav-green-dark hover:underline"
        >
          Zum Login
        </Link>
      </div>
    </div>
  );
}
