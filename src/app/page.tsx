import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { LogOut, Calendar } from "lucide-react";
import { TourCard } from "@/components/tours/TourCard";
import { syncTourStatuses } from "./actions/tour-management";

export default async function Home() {
  const supabase = await createClient();

  // Sync statuses lazily
  await syncTourStatuses();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return redirect("/login");
  }

  // Fetch active profile for personalization
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", session.user.id)
    .single();

  const displayName = profile?.full_name || session.user.email?.split('@')[0];

  // Fetch only the single next upcoming or currently running tour
  const today = new Date().toISOString().split('T')[0];
  const { data: nextTour } = await supabase
    .from("tours")
    .select(`
      *,
      tour_guides (
        user_id,
        profiles (
          full_name
        )
      ),
      tour_participants (
        id,
        status
      )
    `)
    .gte("end_date", today) // Keep showing until it ends
    .neq("status", "completed")
    .order("start_date", { ascending: true })
    .limit(1)
    .single();

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-10">
        <h1 className="text-4xl font-black tracking-tight text-slate-900">
          Servus, {displayName}!
        </h1>
        <p className="mt-2 text-slate-500 font-medium">
          Willkommen im Mitgliederbereich der Sektion Pfarrkirchen
        </p>
      </div>

      <div className="space-y-10">
        {/* Next Tour Section */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-jdav-green" /> Deine nächste Tour
            </h2>
          </div>
          
          {nextTour ? (
            <TourCard tour={nextTour} />
          ) : (
            <div className="rounded-2xl border border-slate-200 border-dashed p-8 text-center bg-slate-50/50">
               <p className="text-sm text-slate-400 italic">Aktuell sind keine Touren geplant.</p>
            </div>
          )}
        </section>

        {/* Vereinsfeed Section */}
        <section>
          <h2 className="mb-4 text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">Vereins-Neuigkeiten</h2>
          
          {/* Placeholder for the Club Feed (Tour Reports & News) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-400 shadow-sm italic">
             <p>Der News-Feed wird derzeit überarbeitet.</p>
          </div>
        </section>
      </div>

      {/* Development tool to sign out */}
      <div className="mt-16 flex justify-center border-t border-slate-100 pt-8">
         <form action="/auth/signout" method="POST">
           <button
             type="submit"
             className="group flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-red-500 transition-all uppercase tracking-widest"
           >
             <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
             Abmelden
           </button>
         </form>
      </div>
    </div>
  );
}
