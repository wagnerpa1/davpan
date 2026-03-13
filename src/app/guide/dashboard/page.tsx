import React from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { 
  Mountain, Users, Calendar, 
  ChevronRight, LayoutDashboard,
  PlusCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

export default async function GuideDashboardPage() {
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (!profile || (profile.role !== "guide" && profile.role !== "admin")) {
    redirect("/touren");
  }

  const isAdmin = profile.role === "admin";

  // Fetch tours: All if admin, only assigned if guide
  let query = supabase
    .from("tours")
    .select(`
      *,
      tour_participants (count),
      tour_guides!inner (user_id)
    `)
    .order("start_date", { ascending: true });

  if (!isAdmin) {
    // If guide, filter by tour_guides
    // Wait, the !inner above already filters if we provide values, 
    // but we need to ensure the user_id matches.
    query = query.eq("tour_guides.user_id", session.user.id);
  } else {
    // Admins see all, but we need to handle the query differently if we don't want the inner join filter
    // Let's rewrite for clarity
    const adminQuery = supabase
      .from("tours")
      .select(`
        *,
        tour_participants (count)
      `)
      .order("start_date", { ascending: true });
    
    // Actually, let's just use two separate paths for query
  }

  // Re-fetch logic for clarity
  let tours: any[] = [];
  if (isAdmin) {
    const { data } = await supabase
      .from("tours")
      .select(`*, tour_participants(count)`)
      .order("start_date", { ascending: true });
    tours = data || [];
  } else {
    // Join with tour_guides to find only assigned tours
    const { data } = await supabase
      .from("tours")
      .select(`
        *,
        tour_participants(count),
        tour_guides!inner(user_id)
      `)
      .eq("tour_guides.user_id", session.user.id)
      .order("start_date", { ascending: true });
    tours = data || [];
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-jdav-green p-2 text-white">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {isAdmin ? "Admin Dashboard" : "Guide Dashboard"}
            </h1>
            <p className="text-sm text-slate-500">
              {isAdmin ? "Gesamte Tourenverwaltung" : "Verwalte deine Touren und Teilnehmer."}
            </p>
          </div>
        </div>
        <Link href="/touren/neu">
          <button className="flex items-center gap-2 rounded-xl bg-jdav-green px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-jdav-green-dark">
            <PlusCircle className="h-4 w-4" /> Tour erstellen
          </button>
        </Link>
      </div>

      <div className="grid gap-4">
        {tours.length > 0 ? (
          tours.map((tour) => (
            <div 
              key={tour.id} 
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:border-jdav-green"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      tour.status === 'open' ? "bg-green-100 text-green-700" :
                      tour.status === 'full' ? "bg-amber-100 text-amber-700" :
                      tour.status === 'completed' ? "bg-slate-100 text-slate-600" :
                      "bg-blue-100 text-blue-700"
                    )}>
                      {tour.status}
                    </span>
                    <span className="text-xs text-slate-400">
                      {tour.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{tour.title}</h3>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-jdav-green" />
                      {tour.start_date ? format(new Date(tour.start_date), "dd.MM.yy") : "TBA"}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-jdav-green" />
                      {tour.tour_participants?.[0]?.count || 0} / {tour.max_participants || "∞"} Teilnehmer
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t pt-4 sm:border-t-0 sm:pt-0">
                  <Link href={`/touren/${tour.id}`} className="flex-1 sm:flex-none">
                    <button className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                      Details
                    </button>
                  </Link>
                  <Link href={`/touren/${tour.id}/edit`} className="flex-1 sm:flex-none">
                    <button className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">
                      Bearbeiten
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
            <Mountain className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900">Noch keine Touren</h3>
            <p className="mt-2 text-sm text-slate-500">
              Du hast noch keine Touren erstellt oder bist noch nicht als Guide zugewiesen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
