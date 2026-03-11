import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { MapPin, Calendar, Users, Mountain, Info, Clock, Route } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function TourDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: tour, error } = await supabase
    .from("tours")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !tour) {
    notFound();
  }

  const { data: { session } } = await supabase.auth.getSession();
  const isLoggedIn = !!session;

  // Render variables
  const isFull = tour.max_participants && tour.status === "full"; // would need actual count

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between text-sm">
        <Link href="/touren" className="text-slate-500 hover:text-jdav-green">
          &larr; Zurück zur Übersicht
        </Link>
        <div className="flex gap-2">
           <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
             {tour.category}
           </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-jdav-green/10 p-8 sm:p-10 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              {tour.title}
            </h1>
            <p className="mt-4 text-lg text-slate-600">
               {tour.target_area || "Zielgebiet noch nicht festgelegt"}
            </p>
        </div>
        
        <div className="p-6 sm:p-10 text-slate-700">
           <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 mb-8">
              <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 text-center">
                 <Calendar className="mb-2 h-6 w-6 text-jdav-green" />
                 <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Datum</span>
                 <span className="mt-1 font-medium">
                   {tour.start_date ? format(new Date(tour.start_date), "dd.MM.yy") : "TBA"}
                 </span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 text-center">
                 <Mountain className="mb-2 h-6 w-6 text-jdav-green" />
                 <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Kategorie</span>
                 <span className="mt-1 font-medium capitalize">{tour.category}</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 text-center">
                 <Route className="mb-2 h-6 w-6 text-jdav-green" />
                 <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Aufstieg</span>
                 <span className="mt-1 font-medium">{tour.elevation ? `${tour.elevation} hm` : "-"}</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 text-center">
                 <Clock className="mb-2 h-6 w-6 text-jdav-green" />
                 <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Dauer</span>
                 <span className="mt-1 font-medium">{tour.duration ? `${tour.duration} h` : "-"}</span>
              </div>
           </div>

           <div className="space-y-8">
             <section>
                <h3 className="mb-3 text-xl font-bold text-slate-900">Beschreibung</h3>
                <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed">
                   <p>{tour.description || "Keine Beschreibung vorhanden."}</p>
                </div>
             </section>

             <section className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                   <h4 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
                      <MapPin className="h-5 w-5 text-jdav-green" /> Treffpunkt
                   </h4>
                   <p className="text-sm text-slate-600">
                      {tour.meeting_point || "P&R Parkplatz Pfarrkirchen"} <br />
                      {tour.meeting_time ? `Um ${tour.meeting_time} Uhr` : "Zeit noch unklar"}
                   </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                   <h4 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
                      <Info className="h-5 w-5 text-jdav-green" /> Voraussetzungen
                   </h4>
                   <p className="text-sm text-slate-600">
                      {tour.requirements || "Keine besonderen Voraussetzungen."}
                   </p>
                </div>
             </section>
           </div>
           
           <div className="mt-10 pt-8 border-t border-slate-200">
              {isLoggedIn ? (
                 <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <div>
                       <p className="font-semibold text-slate-900">
                         {tour.status === "open" ? "Anmeldung geöffnet" : (tour.status === "full" ? "Warteliste" : "Keine Anmeldung möglich")}
                       </p>
                       <p className="text-sm text-slate-500">
                         Teilnehmerlimit: {tour.max_participants || "Unbegrenzt"}
                       </p>
                    </div>
                    <Button 
                      size="lg" 
                      className="w-full sm:w-auto"
                      disabled={tour.status === "planning" || tour.status === "completed"}
                    >
                      {tour.status === "full" ? "Auf Warteliste eintragen" : "Jetzt Anmelden"}
                    </Button>
                 </div>
              ) : (
                 <div className="rounded-2xl bg-amber-50 p-6 text-center border border-amber-100">
                    <p className="mb-4 text-amber-800 font-medium">
                      Du musst angemeldet sein, um dich für Touren einzuschreiben.
                    </p>
                    <Link href="/login">
                       <Button variant="outline" className="border-amber-200 bg-white text-amber-800 hover:bg-amber-100">
                         Zum Login
                       </Button>
                    </Link>
                 </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
