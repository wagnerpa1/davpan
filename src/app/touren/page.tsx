import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { MapPin, Calendar, Users, ChevronRight } from "lucide-react";

export default async function TourenPage() {
  const supabase = await createClient();

  // Fetch all tours ordered by date
  const { data: tours, error } = await supabase
    .from("tours")
    .select("*")
    // In a real scenario we'd query: .gte("start_date", new Date().toISOString()) 
    .order("start_date", { ascending: true });

  if (error) {
    console.error("Error fetching tours:", error);
  }

  // Check if user is logged in to change what is displayed (e.g. guide functionalities)
  const { data: { session } } = await supabase.auth.getSession();
  const isLoggedIn = !!session;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Tourenprogramm
        </h1>
        {/* If guide, show create button */}
      </div>

      <div className="space-y-4">
        {tours && tours.length > 0 ? (
          tours.map((tour) => (
            <Link key={tour.id} href={`/touren/${tour.id}`} className="block">
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-jdav-green hover:shadow-md">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <span className="mb-2 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {tour.category}
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 group-hover:text-jdav-green">
                      {tour.title}
                    </h2>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600 sm:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-jdav-green" />
                    <span>
                      {tour.start_date
                        ? format(new Date(tour.start_date), "dd.MM.yyyy", { locale: de })
                        : "TBA"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-jdav-green" />
                    <span className="truncate">{tour.target_area || "n/a"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-jdav-green" />
                    <span>Max. {tour.max_participants || "Unbegrenzt"}</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                   <div className="inline-flex rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-jdav-green-dark ring-1 ring-inset ring-green-600/20">
                     Status: {tour.status === 'open' ? 'Anmeldung offen' : tour.status}
                   </div>
                   {tour.difficulty && (
                     <div className="inline-flex rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                       Schwierigkeit: {tour.difficulty}
                     </div>
                   )}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-slate-200 border-dashed p-12 text-center">
            <Calendar className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900">Keine Touren gefunden</h3>
            <p className="mt-2 text-sm text-slate-500">
              Aktuell stehen keine Touren auf dem Programm.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
