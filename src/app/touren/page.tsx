import { Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ComponentProps } from "react";
import { syncTourStatuses } from "@/app/actions/tour-management";
import { TourCard } from "@/components/tours/TourCard";
import { TourFilters } from "@/components/tours/TourFilters";
import { getCurrentUserProfile } from "@/lib/auth";
import {
  getTourVisibilityDateLimit,
  shouldApplyTourVisibilityLimit,
} from "@/lib/tours/visibility";
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

type TourSearchParams = Record<string, string | string[] | undefined>;

function getSearchParam(params: TourSearchParams, key: string, fallback = "") {
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function toTimestamp(value: string | null | undefined) {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
}

function normalizeCategoryFilter(
  categoryFilter: string,
  categories: TourCategoryOption[],
) {
  if (!categoryFilter) return categoryFilter;

  // Shared URLs may still contain the human-readable label, so resolve both forms.
  const categoryByLabel = new Map(
    categories
      .filter((category) => category.category !== null)
      .map((category) => [category.category?.toLowerCase(), category.id]),
  );

  return categoryByLabel.get(categoryFilter.toLowerCase()) ?? categoryFilter;
}

function getConfirmedCount(
  tour: Pick<
    TourCardItem,
    "confirmed_participants_count" | "tour_participants"
  >,
) {
  return (
    tour.confirmed_participants_count ??
    tour.tour_participants?.filter(
      (participant) => participant.status === "confirmed",
    ).length ??
    0
  );
}

function isCancelledTourVisible(
  tour: Pick<TourCardItem, "status" | "start_date" | "end_date">,
  todayIso: string,
) {
  if (tour.status !== "cancelled") {
    return true;
  }

  // Cancelled tours remain listed until their end date so users still see recent changes.
  const relevantEndDate = tour.end_date || tour.start_date;

  return Boolean(relevantEndDate && relevantEndDate >= todayIso);
}

function getCapacityRatio(
  tour: Pick<
    TourCardItem,
    "max_participants" | "confirmed_participants_count" | "tour_participants"
  >,
) {
  const confirmedCount = getConfirmedCount(tour);
  const maxParticipants = tour.max_participants || 999;

  return confirmedCount / maxParticipants;
}

function sortByCapacity(a: TourCardItem, b: TourCardItem, sortBy: string) {
  return sortBy === "capacity_low"
    ? getCapacityRatio(b) - getCapacityRatio(a)
    : getCapacityRatio(a) - getCapacityRatio(b);
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

/**
 * The main Tour overview page.
 * Displays all active and recently cancelled tours, supports filtering by category, difficulty, guide, and group.
 * Server Component: fetches data and filters mostly via Supabase query, with some in-memory fallback for complex calculations (e.g. capacity).
 */
export default async function TourenPage({
  searchParams,
}: {
  searchParams: Promise<TourSearchParams>;
}) {
  const [supabase, params, authContext] = await Promise.all([
    createClient(),
    searchParams,
    getCurrentUserProfile(),
  ]);

  // Sync statuses before fetching
  await syncTourStatuses();

  if (!authContext.user) {
    redirect("/login");
  }

  const categoryFilter = getSearchParam(params, "category");
  const difficultyFilter = getSearchParam(params, "difficulty");
  const guideFilter = getSearchParam(params, "guide");
  const groupFilter = getSearchParam(params, "group");
  const availableOnly = getSearchParam(params, "available") === "true";
  const sortBy = getSearchParam(params, "sort", "date_asc");

  // Fetch unique data for filters (only for active tours)
  const { data: categoryData } = await supabase
    .from("tour_categorys")
    .select("id, category")
    .order("category");
  const categories = ((categoryData || []) as TourCategoryOption[]).filter(
    (c): c is { id: string; category: string } => Boolean(c.category),
  );
  const normalizedCategoryFilter = normalizeCategoryFilter(
    categoryFilter,
    categories,
  );

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

  // Build query
  let query = supabase
    .from("tours")
    .select(`
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
    `)
    .neq("status", "completed"); // Keep cancelled visible until end date

  if (normalizedCategoryFilter) {
    query = query.eq("category", normalizedCategoryFilter);
  }
  if (difficultyFilter) query = query.eq("difficulty", difficultyFilter);
  if (groupFilter) query = query.eq("group", groupFilter);

  // Business logic: Filter future tours by visibility date for members.
  const visibilityDateLimit = getTourVisibilityDateLimit(new Date());

  // Hide future "planung" or regular tours from non-guides if date limit exceeded
  if (shouldApplyTourVisibilityLimit(authContext.role)) {
    query = query.lt("start_date", visibilityDateLimit);
  }

  const { data: tours, error } = await query.order("start_date", {
    ascending: sortBy === "date_asc",
  });

  if (error) {
    console.error("Error fetching tours:", error);
  }

  const tourIds = (tours || []).map((tour) => tour.id);
  const { data: countRows, error: countError } =
    tourIds.length > 0
      ? await supabase.rpc("get_tour_participant_counts", {
          p_tour_ids: tourIds,
        })
      : { data: [], error: null };

  if (countError) {
    console.error("Error fetching participant counts:", countError);
  }

  const confirmedCountByTour = new Map<string, number>(
    ((countRows || []) as TourParticipantCountRow[]).map((row) => [
      row.tour_id,
      row.confirmed_count || 0,
    ]),
  );

  // Check if user is logged in for "Create" button (session already fetched above)
  const userRole = authContext.role;
  const canCreate = userRole === "guide" || userRole === "admin";

  let filteredTours: TourCardItem[] = normalizeTourRows(
    tours as RawTourCardItem[] | null,
  ).map((tour) => ({
    ...tour,
    confirmed_participants_count: confirmedCountByTour.get(tour.id) ?? 0,
  }));

  const todayIso = new Date().toISOString().split("T")[0];

  filteredTours = filteredTours.filter((tour) =>
    isCancelledTourVisible(tour, todayIso),
  );

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
    filteredTours.sort((a, b) => sortByCapacity(a, b, sortBy));
  } else if (sortBy === "date_desc") {
    filteredTours.sort(
      (a, b) => toTimestamp(b.start_date) - toTimestamp(a.start_date),
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-10 flex flex-col gap-4 xs:flex-row xs:items-center xs:justify-between lg:mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Tourenprogramm
        </h1>
        <div className="flex w-full flex-col gap-2 xs:w-auto xs:flex-row">
          <Link
            href="/touren/meine"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-jdav-green-dark px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-jdav-green xs:w-auto"
          >
            Meine Touren
          </Link>
          {canCreate && (
            <Link
              href="/touren/neu"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-jdav-green-dark px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-jdav-green xs:w-auto"
            >
              Tour erstellen
            </Link>
          )}
        </div>
      </div>

      <TourFilters
        categories={categories}
        difficulties={difficulties}
        guides={guides || []}
        tourGroups={tourGroups || []}
      />

      <div className="space-y-4">
        {filteredTours.length > 0 ? (
          filteredTours.map((tour) => <TourCard key={tour.id} tour={tour} />)
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
