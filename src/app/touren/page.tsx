import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { MapPin, Calendar, Users, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { TourFilters } from "@/components/tours/TourFilters";

export default async function TourenPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const categoryFilter = params.category as string;
  const difficultyFilter = params.difficulty as string;
  const guideFilter = params.guide as string;
  const availableOnly = params.available === "true";
  const sortBy = (params.sort as string) || "date_asc";

  // Fetch unique data for filters
  const { data: allToursData } = await supabase.from("tours").select("category, difficulty");
  const categories = Array.from(new Set(allToursData?.map(t => t.category).filter(Boolean))) as string[];
  const difficulties = Array.from(new Set(allToursData?.map(t => t.difficulty).filter(Boolean))) as string[];
  
  const { data: guides } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("role", ["guide", "admin"])
    .order("full_name");

  // Build query
  let query = supabase
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
    `);

  if (categoryFilter) query = query.eq("category", categoryFilter);
  if (difficultyFilter) query = query.eq("difficulty", difficultyFilter);
  if (guideFilter) {
    // Note: Filtering by joined table in Supabase can be tricky with many-to-many
    // We'll do a subquery or filter in memory if it's easier, but let's try .rpc or filtered join
    // For simplicity and correctness with small-ish data, we'll filter guides in memory below
  }

  const { data: tours, error } = await query.order("start_date", { ascending: sortBy === "date_asc" });

  if (error) {
    console.error("Error fetching tours:", error);
  }

  // Check if user is logged in for "Create" button
  const { data: { session } } = await supabase.auth.getSession();
  let userRole = null;
  if (session) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();
    userRole = profile?.role;
  }
  const canCreate = userRole === 'guide' || userRole === 'admin';

  // Apply in-memory filters (Guide & Availability) and Sorting (Capacity)
  let filteredTours = tours || [];

  if (guideFilter) {
    filteredTours = filteredTours.filter(tour => 
      tour.tour_guides?.some((tg: any) => tg.user_id === guideFilter)
    );
  }

  if (availableOnly) {
    filteredTours = filteredTours.filter(tour => {
      const confirmedCount = tour.tour_participants?.filter((p: any) => p.status === 'confirmed').length || 0;
      const maxParticipants = tour.max_participants || 0;
      return maxParticipants === 0 || confirmedCount < maxParticipants;
    });
  }

  if (sortBy.startsWith("capacity")) {
    filteredTours.sort((a, b) => {
      const getCapacity = (t: any) => {
        const conf = t.tour_participants?.filter((p: any) => p.status === 'confirmed').length || 0;
        const max = t.max_participants || 999;
        return conf / max;
      };
      return sortBy === "capacity_low" ? getCapacity(b) - getCapacity(a) : getCapacity(a) - getCapacity(b);
    });
  } else if (sortBy === "date_desc") {
    // Already handled by Supabase order except for desc
    filteredTours.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Tourenprogramm
        </h1>
        {canCreate && (
          <Link href="/touren/neu">
            <button className="inline-flex items-center gap-2 rounded-xl bg-jdav-green px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-jdav-green-dark shadow-sm">
              Tour erstellen
            </button>
          </Link>
        )}
      </div>

      <TourFilters 
        categories={categories}
        difficulties={difficulties}
        guides={guides || []}
      />

      <div className="space-y-4">
        {filteredTours.length > 0 ? (
          filteredTours.map((tour) => {
            const confirmedCount = tour.tour_participants?.filter((p: any) => p.status === 'confirmed').length || 0;
            const maxParticipants = tour.max_participants || 0;
            const isFull = maxParticipants > 0 && confirmedCount >= maxParticipants;
            const isLow = maxParticipants > 0 && (maxParticipants - confirmedCount) <= 2 && !isFull;
            
            let barColor = "bg-jdav-green";
            if (isFull) barColor = "bg-red-500";
            else if (isLow) barColor = "bg-orange-400";

            return (
              <Link key={tour.id} href={`/touren/${tour.id}`} className="block">
                <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:border-jdav-green hover:shadow-md">
                  {/* Capacity Bar */}
                  <div className={cn("h-1.5 w-full", barColor)} />
                  
                  <div className="p-5">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <div className="mb-2 flex flex-wrap gap-2">
                          <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            {tour.category}
                          </span>
                          {isFull && (
                            <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-600 uppercase">
                              Warteliste aktiv
                            </span>
                          )}
                        </div>
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
                          {tour.start_date ? (
                            tour.end_date && tour.start_date !== tour.end_date ? (
                              `${format(new Date(tour.start_date), "dd.MM.")} - ${format(new Date(tour.end_date), "dd.MM.yy")}`
                            ) : (
                              format(new Date(tour.start_date), "dd.MM.yyyy")
                            )
                          ) : "TBA"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-jdav-green shrink-0" />
                        <span className="truncate">
                          <span className="text-slate-400 mr-1">Ziel:</span>
                          {tour.target_area || "n/a"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-jdav-green" />
                        <span className={cn(isFull && "text-red-600 font-bold")}>
                          {confirmedCount} / {tour.max_participants || "∞"}
                        </span>
                      </div>
                    </div>

                    {tour.tour_guides && tour.tour_guides.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="font-medium text-slate-400">Leitung:</span>
                        {tour.tour_guides.map((tg: any, idx: number) => (
                          <span key={idx}>{tg.profiles?.full_name}</span>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                       <div className={cn(
                         "inline-flex rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                         tour.status === 'open' ? "bg-green-50 text-jdav-green-dark ring-green-600/20" : 
                         tour.status === 'full' ? "bg-amber-50 text-amber-800 ring-amber-600/20" :
                         tour.status === 'completed' ? "bg-slate-50 text-slate-600 ring-slate-600/20" :
                         "bg-blue-50 text-blue-700 ring-blue-700/10"
                       )}>
                         {
                           tour.status === 'open' ? 'Anmeldung offen' : 
                           tour.status === 'full' ? 'Ausgebucht' :
                           tour.status === 'completed' ? 'Abgeschlossen' :
                           tour.status === 'planning' ? 'In Planung' : tour.status
                         }
                       </div>
                       {tour.difficulty && (
                         <div className="inline-flex rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700 ring-1 ring-inset ring-stone-200">
                           {tour.difficulty}
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="rounded-2xl border border-slate-200 border-dashed p-12 text-center">
            <Search className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900">Keine passenden Touren gefunden</h3>
            <p className="mt-2 text-sm text-slate-500">
              Versuche es mit anderen Filtereinstellungen oder setze alle Filter zurück.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
