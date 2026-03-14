import { Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ComponentProps } from "react";
import { syncTourStatuses } from "@/app/actions/tour-management";
import { TourCard } from "@/components/tours/TourCard";
import { TourFilters } from "@/components/tours/TourFilters";
import { createClient } from "@/utils/supabase/server";

type TourCardItem = ComponentProps<typeof TourCard>["tour"];

function toTimestamp(value: string | null | undefined) {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
}

export default async function TourenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  // Sync statuses before fetching
  await syncTourStatuses();

  // Auth check – internal area requires login
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/login");
  }

  const categoryFilter = params.category as string;
  const difficultyFilter = params.difficulty as string;
  const guideFilter = params.guide as string;
  const groupFilter = params.group as string;
  const availableOnly = params.available === "true";
  const sortBy = (params.sort as string) || "date_asc";

  // Fetch unique data for filters (only for active tours)
  const { data: allToursData } = await supabase
    .from("tours")
    .select("category, difficulty")
    .neq("status", "completed");

  const categories = Array.from(
    new Set(allToursData?.map((t) => t.category).filter(Boolean)),
  ) as string[];
  const difficulties = Array.from(
    new Set(allToursData?.map((t) => t.difficulty).filter(Boolean)),
  ) as string[];

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
    `)
    .neq("status", "completed"); // Only show active tours

  if (categoryFilter) query = query.eq("category", categoryFilter);
  if (difficultyFilter) query = query.eq("difficulty", difficultyFilter);
  if (groupFilter) query = query.eq("group", groupFilter);

  const { data: tours, error } = await query.order("start_date", {
    ascending: sortBy === "date_asc",
  });

  if (error) {
    console.error("Error fetching tours:", error);
  }

  // Check if user is logged in for "Create" button (session already fetched above)
  let userRole = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    userRole = profile?.role;
  }
  const canCreate = userRole === "guide" || userRole === "admin";

  // Apply in-memory filters (Guide & Availability) and Sorting (Capacity)
  let filteredTours: TourCardItem[] = (tours as TourCardItem[]) || [];

  if (guideFilter) {
    filteredTours = filteredTours.filter((tour) =>
      tour.tour_guides?.some((tg) => tg.user_id === guideFilter),
    );
  }

  if (availableOnly) {
    filteredTours = filteredTours.filter((tour) => {
      const confirmedCount =
        tour.tour_participants?.filter((p) => p.status === "confirmed")
          .length || 0;
      const maxParticipants = tour.max_participants || 0;
      return maxParticipants === 0 || confirmedCount < maxParticipants;
    });
  }

  if (sortBy.startsWith("capacity")) {
    filteredTours.sort((a, b) => {
      const getCapacity = (t: TourCardItem) => {
        const conf =
          t.tour_participants?.filter((p) => p.status === "confirmed").length ||
          0;
        const max = t.max_participants || 999;
        return conf / max;
      };
      return sortBy === "capacity_low"
        ? getCapacity(b) - getCapacity(a)
        : getCapacity(a) - getCapacity(b);
    });
  } else if (sortBy === "date_desc") {
    filteredTours.sort(
      (a, b) => toTimestamp(b.start_date) - toTimestamp(a.start_date),
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 xs:flex-row xs:items-center xs:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Tourenprogramm
        </h1>
        {canCreate && (
          <Link href="/touren/neu" className="w-full xs:w-auto">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-jdav-green px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-jdav-green-dark shadow-sm"
            >
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
          filteredTours.map((tour) => (
            <TourCard
              key={tour.id}
              tour={tour as ComponentProps<typeof TourCard>["tour"]}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-slate-200 border-dashed p-12 text-center">
            <Search className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900">
              Keine passenden Touren gefunden
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Versuche es mit anderen Filtereinstellungen oder setze alle Filter
              zurück.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
