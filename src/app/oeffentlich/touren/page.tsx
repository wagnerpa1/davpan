import { Search } from "lucide-react";
import Link from "next/link";
import type { ComponentProps } from "react";
import { TourCard } from "@/components/tours/TourCard";
import { TourFilters } from "@/components/tours/TourFilters";
import { createClient } from "@/utils/supabase/server";

type TourCardItem = ComponentProps<typeof TourCard>["tour"];

type RawTourCardItem = Omit<
  TourCardItem,
  "tour_groups" | "tour_categorys" | "tour_guides"
> & {
  tour_groups?:
    | { group_name: string | null }
    | { group_name: string | null }[]
    | null;
  tour_categorys?:
    | { category: string | null }
    | { category: string | null }[]
    | null;
  tour_guides?: Array<{
    user_id: string;
    profiles?:
      | { full_name?: string | null }
      | { full_name?: string | null }[]
      | null;
  }>;
};

interface TourCategoryOption {
  id: string;
  category: string | null;
}

interface TourParticipantCountRow {
  tour_id: string;
  confirmed_count: number;
}

function toTimestamp(value: string | null | undefined) {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
}

function normalizeTourRows(rows: RawTourCardItem[] | null): TourCardItem[] {
  return (rows || []).map((tour) => ({
    ...tour,
    tour_groups: Array.isArray(tour.tour_groups)
      ? (tour.tour_groups[0] ?? null)
      : tour.tour_groups,
    tour_categorys: Array.isArray(tour.tour_categorys)
      ? (tour.tour_categorys[0] ?? null)
      : tour.tour_categorys,
    tour_guides: tour.tour_guides?.map((guide) => ({
      ...guide,
      profiles: Array.isArray(guide.profiles)
        ? (guide.profiles[0] ?? null)
        : guide.profiles,
    })),
  }));
}

export default async function PublicToursPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const categoryFilter = params.category as string;
  const difficultyFilter = params.difficulty as string;
  const guideFilter = params.guide as string;
  const groupFilter = params.group as string;
  const availableOnly = params.available === "true";
  const sortBy = (params.sort as string) || "date_asc";

  const { data: categoryData } = await supabase
    .from("tour_categorys")
    .select("id, category")
    .order("category");

  const categories = ((categoryData || []) as TourCategoryOption[]).filter(
    (c): c is { id: string; category: string } => Boolean(c.category),
  );

  const categoryByLabel = new Map(
    categories.map((c) => [c.category.toLowerCase(), c.id]),
  );

  const normalizedCategoryFilter =
    categoryFilter && categoryByLabel.has(categoryFilter.toLowerCase())
      ? (categoryByLabel.get(categoryFilter.toLowerCase()) as string)
      : categoryFilter;

  const { data: allToursData } = await supabase
    .from("tours")
    .select("difficulty")
    .neq("status", "completed");

  const difficulties = Array.from(
    new Set(allToursData?.map((t) => t.difficulty).filter(Boolean)),
  ) as string[];

  const { data: guides } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("role", ["guide", "admin"])
    .order("full_name");

  const { data: tourGroups } = await supabase
    .from("tour_groups")
    .select("id, group_name")
    .order("group_name");

  let query = supabase
    .from("tours")
    .select(
      `
      id,
      title,
      category,
      status,
      start_date,
      end_date,
      target_area,
      max_participants,
      difficulty,
      group,
      tour_guides (
        user_id,
        profiles (
          full_name
        )
      ),
      tour_groups!tours_group_fkey (
        group_name
      ),
      tour_categorys!tours_category_fkey (
        category
      )
      `,
    )
    .neq("status", "completed");

  if (normalizedCategoryFilter) {
    query = query.eq("category", normalizedCategoryFilter);
  }
  if (difficultyFilter) query = query.eq("difficulty", difficultyFilter);
  if (groupFilter) query = query.eq("group", groupFilter);

  const { data: tours, error } = await query.order("start_date", {
    ascending: sortBy === "date_asc",
  });

  const tourIds = (tours || []).map((tour) => tour.id);
  const { data: countRows } =
    tourIds.length > 0
      ? await supabase.rpc("get_tour_participant_counts", {
          p_tour_ids: tourIds,
        })
      : { data: [] };

  const confirmedCountByTour = new Map<string, number>(
    ((countRows || []) as TourParticipantCountRow[]).map((row) => [
      row.tour_id,
      row.confirmed_count || 0,
    ]),
  );

  const todayIso = new Date().toISOString().split("T")[0];

  let filteredTours: TourCardItem[] = normalizeTourRows(
    tours as RawTourCardItem[] | null,
  ).map((tour) => ({
    ...tour,
    confirmed_participants_count: confirmedCountByTour.get(tour.id) ?? 0,
  }));

  filteredTours = filteredTours.filter((tour) => {
    if (tour.status !== "cancelled") {
      return true;
    }

    const relevantEndDate = tour.end_date || tour.start_date;
    if (!relevantEndDate) {
      return false;
    }

    return relevantEndDate >= todayIso;
  });

  const getConfirmedCount = (tour: TourCardItem) =>
    tour.confirmed_participants_count ??
    tour.tour_participants?.filter((p) => p.status === "confirmed").length ??
    0;

  if (guideFilter) {
    filteredTours = filteredTours.filter((tour) =>
      tour.tour_guides?.some((tg) => tg.user_id === guideFilter),
    );
  }

  if (availableOnly) {
    filteredTours = filteredTours.filter((tour) => {
      const confirmedCount = getConfirmedCount(tour);
      const maxParticipants = tour.max_participants || 0;
      return maxParticipants === 0 || confirmedCount < maxParticipants;
    });
  }

  if (sortBy.startsWith("capacity")) {
    filteredTours.sort((a, b) => {
      const getCapacity = (t: TourCardItem) => {
        const conf = getConfirmedCount(t);
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
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

      <TourFilters
        categories={categories}
        difficulties={difficulties}
        guides={guides || []}
        tourGroups={tourGroups || []}
        basePath="/oeffentlich/touren"
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
