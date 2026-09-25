import type { SupabaseClient } from "@supabase/supabase-js";

export interface TourCardGuide {
  user_id: string;
  profiles?: {
    full_name?: string | null;
  } | null;
}

export interface TourCardData {
  id: string;
  title: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  target_area?: string | null;
  max_participants?: number | null;
  confirmed_participants_count?: number | null;
  difficulty?: string | null;
  tour_groups?: {
    group_name: string | null;
  } | null;
  tour_categorys?: {
    category: string | null;
  } | null;
  tour_guides?: TourCardGuide[];
}

export interface UserTourRegistration {
  id: string;
  tour_id: string;
  status: string;
  waitlist_position: number | null;
  child_profile_id: string | null;
  child_name: string | null;
  tour: TourCardData;
}

export interface RegistrationTab {
  id: string;
  label: string;
  kind: "self" | "child";
  child_profile_id: string | null;
  registrations: UserTourRegistration[];
}

export interface TourRegistrationOverview {
  tabs: RegistrationTab[];
  isParent: boolean;
}

interface ChildProfileRow {
  id: string;
  full_name: string | null;
}

interface TourParticipantRow {
  id: string;
  tour_id: string;
  status: string;
  waitlist_position: number | null;
  child_profile_id: string | null;
  child_profiles?: ChildProfileRow | ChildProfileRow[] | null;
  tours?: TourCardData | TourCardData[] | null;
}

type SupabaseLike = Pick<SupabaseClient, "from">;

const TOUR_SELECT = `
  id,
  tour_id,
  status,
  waitlist_position,
  child_profile_id,
  child_profiles (
    id,
    full_name
  ),
  tours (
    id,
    title,
    status,
    start_date,
    end_date,
    target_area,
    max_participants,
    difficulty,
    tour_groups!tours_group_fkey (
      group_name
    ),
    tour_categorys!tours_category_fkey (
      category
    ),
    tour_guides (
      user_id,
      profiles (
        full_name
      )
    )
  )
`;

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function buildRegistrationRows(rows: TourParticipantRow[] | null | undefined) {
  return (rows ?? [])
    .map((row) => {
      const childProfile = normalizeRelation(row.child_profiles);
      const tour = normalizeRelation(row.tours);

      const resolvedTour: TourCardData = tour ?? {
        id: row.tour_id,
        title: "Tour nicht verfügbar",
        status: "unknown",
      };

      return {
        id: row.id,
        tour_id: row.tour_id,
        status: row.status,
        waitlist_position: row.waitlist_position,
        child_profile_id: row.child_profile_id,
        child_name: childProfile?.full_name ?? null,
        tour: resolvedTour,
      } satisfies UserTourRegistration;
    })
    .filter((row): row is UserTourRegistration => Boolean(row));
}

function sortByTourDate(registrations: UserTourRegistration[]) {
  return [...registrations].sort((left, right) => {
    const leftDate = left.tour.start_date
      ? Date.parse(left.tour.start_date)
      : 0;
    const rightDate = right.tour.start_date
      ? Date.parse(right.tour.start_date)
      : 0;

    return leftDate - rightDate;
  });
}

export async function loadTourRegistrationOverview(
  supabase: SupabaseLike,
  userId: string,
  isParent: boolean,
): Promise<TourRegistrationOverview> {
  // Check for historical child profile claimed by this user
  const { data: claimedChildRows } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("user_id", userId);

  const claimedChildIds = ((claimedChildRows ?? []) as { id: string }[]).map(
    (c) => c.id,
  );

  let selfQuery = supabase
    .from("tour_participants")
    .select(TOUR_SELECT)
    .order("created_at", { ascending: false });

  if (claimedChildIds.length > 0) {
    selfQuery = selfQuery.or(
      `and(user_id.eq.${userId},child_profile_id.is.null),child_profile_id.in.(${claimedChildIds.join(",")})`,
    );
  } else {
    selfQuery = selfQuery.eq("user_id", userId).is("child_profile_id", null);
  }

  const [selfResult, childProfilesResult] = await Promise.all([
    selfQuery,
    isParent
      ? supabase
          .from("child_profiles")
          .select("id, full_name")
          .eq("parent_id", userId)
          .eq("is_active", true)
          .order("full_name")
      : Promise.resolve({ data: [] as ChildProfileRow[] | null, error: null }),
  ]);

  const childProfiles = (
    (childProfilesResult.data ?? []) as ChildProfileRow[]
  ).filter((child): child is ChildProfileRow => Boolean(child?.id));
  const childIds = childProfiles.map((child) => child.id);

  const childResult =
    isParent && childIds.length > 0
      ? await supabase
          .from("tour_participants")
          .select(TOUR_SELECT)
          .in("child_profile_id", childIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };

  const selfRegistrations = sortByTourDate(
    buildRegistrationRows(
      (selfResult.data ?? []) as unknown as TourParticipantRow[],
    ),
  );
  const childRegistrations = sortByTourDate(
    buildRegistrationRows(
      (childResult.data ?? []) as unknown as TourParticipantRow[],
    ),
  );

  const tabs: RegistrationTab[] = [
    {
      id: "self",
      label: "Ich",
      kind: "self",
      child_profile_id: null,
      registrations: selfRegistrations,
    },
    ...childProfiles.map((child) => ({
      id: `child-${child.id}`,
      label: child.full_name || "Kind",
      kind: "child" as const,
      child_profile_id: child.id,
      registrations: childRegistrations.filter(
        (registration) => registration.child_profile_id === child.id,
      ),
    })),
  ];

  return {
    tabs,
    isParent,
  };
}

export function getRegistrationDisplayLabel(
  status: string,
  waitlistPosition?: number | null,
) {
  switch (status) {
    case "confirmed":
      return "Bestätigt";
    case "pending":
      return "Offen";
    case "waitlist":
      return waitlistPosition != null
        ? `Warteliste #${waitlistPosition}`
        : "Warteliste";
    case "cancelled":
      return "Abgemeldet";
    default:
      return status;
  }
}

export function getNextConfirmedRegistration(tabs: RegistrationTab[]) {
  const confirmedRegistrations: UserTourRegistration[] = [];

  for (const tab of tabs) {
    for (const registration of tab.registrations) {
      if (
        registration.status === "confirmed" &&
        registration.tour.status !== "completed" &&
        registration.tour.status !== "cancelled"
      ) {
        confirmedRegistrations.push(registration);
      }
    }
  }

  return sortByTourDate(confirmedRegistrations)[0] ?? null;
}

const NEXT_CONFIRMED_SELECT = `
  id,
  tour_id,
  status,
  waitlist_position,
  child_profile_id,
  child_profiles (
    id,
    full_name
  ),
  tours!inner (
    id,
    title,
    status,
    start_date,
    end_date,
    target_area,
    max_participants,
    difficulty,
    tour_groups!tours_group_fkey (
      group_name
    ),
    tour_categorys!tours_category_fkey (
      category
    ),
    tour_guides (
      user_id,
      profiles (
        full_name
      )
    )
  )
`;

/**
 * Loads only the soonest upcoming confirmed registration for the home dashboard.
 */
export async function loadNextConfirmedRegistration(
  supabase: SupabaseLike,
  userId: string,
  isParent: boolean,
): Promise<UserTourRegistration | null> {
  const today = new Date().toISOString().split("T")[0];

  const { data: claimedChildRows } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("user_id", userId);

  const claimedChildIds = ((claimedChildRows ?? []) as { id: string }[]).map(
    (c) => c.id,
  );

  let selfQuery = supabase
    .from("tour_participants")
    .select(NEXT_CONFIRMED_SELECT)
    .eq("status", "confirmed")
    .gte("tours.end_date", today)
    .not("tours.status", "in", "(completed,cancelled)")
    .order("start_date", {
      ascending: true,
      referencedTable: "tours",
    })
    .limit(1);

  if (claimedChildIds.length > 0) {
    selfQuery = selfQuery.or(
      `and(user_id.eq.${userId},child_profile_id.is.null),child_profile_id.in.(${claimedChildIds.join(",")})`,
    );
  } else {
    selfQuery = selfQuery.eq("user_id", userId).is("child_profile_id", null);
  }

  const [selfResult, childProfilesResult] = await Promise.all([
    selfQuery,
    isParent
      ? supabase
          .from("child_profiles")
          .select("id")
          .eq("parent_id", userId)
          .eq("is_active", true)
      : Promise.resolve({ data: [] as { id: string }[] | null }),
  ]);

  const childIds = (
    (childProfilesResult.data ?? []) as { id: string }[]
  ).flatMap((child) => (child.id ? [child.id] : []));

  const childResult =
    isParent && childIds.length > 0
      ? await supabase
          .from("tour_participants")
          .select(NEXT_CONFIRMED_SELECT)
          .in("child_profile_id", childIds)
          .eq("status", "confirmed")
          .gte("tours.end_date", today)
          .not("tours.status", "in", "(completed,cancelled)")
          .order("start_date", {
            ascending: true,
            referencedTable: "tours",
          })
          .limit(1)
      : { data: [] };

  const candidates = sortByTourDate([
    ...buildRegistrationRows(
      (selfResult.data ?? []) as unknown as TourParticipantRow[],
    ),
    ...buildRegistrationRows(
      (childResult.data ?? []) as unknown as TourParticipantRow[],
    ),
  ]);

  return candidates[0] ?? null;
}
