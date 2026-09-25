import { format } from "date-fns";
import { Edit } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TourDetailsContent } from "@/components/tours/TourDetailsContent";
import { TourHero } from "@/components/tours/TourHero";
import { TourInfoGrid } from "@/components/tours/TourInfoGrid";
import { TourRegistrationSection } from "@/components/tours/TourRegistrationSection";
import { getCurrentUserProfile } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { createClient } from "@/utils/supabase/server";

const CalendarExport = dynamic(() =>
  import("@/components/tours/CalendarExport").then((mod) => mod.CalendarExport),
);

const DeleteTourButton = dynamic(() =>
  import("@/components/tours/DeleteTourButton").then(
    (mod) => mod.DeleteTourButton,
  ),
);

const ParticipantManagement = dynamic(() =>
  import("@/components/tours/ParticipantManagement").then(
    (mod) => mod.ParticipantManagement,
  ),
);

interface AvailableMaterial {
  id: string; // material_type_id
  name: string;
  sizes: string[];
}

interface ChildProfileOption {
  id: string;
  full_name: string;
  birthdate: string;
}

interface UserRegistration {
  id: string;
  user_id: string;
  child_profile_id: string | null;
  status: string;
  waitlist_position?: number | null;
}

interface TourGuide {
  user_id?: string | null;
  profiles?: {
    id?: string | null;
    full_name?: string | null;
  } | null;
}

interface TourParticipant {
  id: string;
  status: string;
  user_id: string;
  child_profile_id: string | null;
  waitlist_position: number | null;
  age_override: number | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
    phone: string | null;
    emergency_phone: string | null;
    medical_notes: string | null;
    birthdate: string | null;
  } | null;
  child_profiles?: {
    full_name: string | null;
    medical_notes: string | null;
    birthdate: string | null;
    profiles?: {
      full_name: string | null;
    } | null;
  } | null;
}

interface TourDetailUiState {
  id: string;
  title: string;
  description: string | null;
  target_area: string | null;
  start_date: string | null;
  end_date: string | null;
  meeting_point: string | null;
  meeting_time: string | null;
  duration_hours: number | null;
  max_participants: number | null;
  min_age: number | null;
  status: string;
  difficulty: string | null;
  distance: number | null;
  cost_info: string | null;
  requirements: string | null;
  created_by: string | null;
  registration_deadline: string | null;
  tour_guides?: TourGuide[] | null;
  tour_participants?: TourParticipant[] | null;
}

interface TourMaterialRequirementRow {
  material_type_id: string;
  material_types: {
    id: string;
    name: string;
    inventory?: Array<{
      id: string;
      size: string | null;
      quantity_available: number;
    }> | null;
  } | null;
}

interface ReservationQueryRow {
  id: string;
  material_inventory_id: string;
  user_id: string;
  child_profile_id: string | null;
  material_inventory?: {
    size?: string | null;
    material_types?: {
      name?: string | null;
    } | null;
  } | null;
}

interface TourGroupRelation {
  tour_groups?: {
    group_name?: string | null;
  } | null;
}

interface TourCategoryRelation {
  tour_categorys?: {
    category?: string | null;
  } | null;
}

interface TourParticipantCountRow {
  tour_id: string;
  confirmed_count: number;
}

async function getTourDetailData(
  id: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const [
    { data: tour, error },
    authContext,
    { data: tmData },
    { data: countRows },
  ] = await Promise.all([
    supabase
      .from("tours")
      .select(`
        *,
        tour_guides (
          user_id,
          profiles (
            id,
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
      .eq("id", id)
      .single(),
    getCurrentUserProfile(),
    supabase
      .from("tour_material_requirements")
      .select(`
        material_type_id,
        material_types(
          id,
          name,
          inventory:material_inventory(id, size, quantity_available)
        )
      `)
      .eq("tour_id", id),
    supabase.rpc("get_tour_participant_counts", {
      p_tour_ids: [id],
    }),
  ]);

  if (error || !tour) return null;

  const tourData = tour as typeof tour & TourDetailUiState;
  const isLoggedIn = !!authContext.user;

  const materialMap = new Map<string, AvailableMaterial>();
  (tmData as TourMaterialRequirementRow[] | null)?.forEach((row) => {
    const type = row.material_types;
    if (type?.inventory) {
      const sizesSet = new Set<string>();
      type.inventory.forEach((inv) => {
        if (inv.quantity_available > 0 && inv.size) {
          sizesSet.add(inv.size);
        }
      });
      const sizes = Array.from(sizesSet);
      if (sizes.length === 0 && type.inventory.length > 0) {
        sizes.push("Universal");
      }

      if (sizes.length > 0) {
        materialMap.set(type.id, {
          id: type.id,
          name: type.name,
          sizes: sizes.sort(),
        });
      }
    }
  });
  const availableMaterials = Array.from(materialMap.values());

  let childrenProfiles: ChildProfileOption[] = [];
  let userRegistrations: UserRegistration[] = [];
  let userBirthdate: string | null = null;
  let canManageTour = false;

  if (authContext.user) {
    userBirthdate = authContext.birthdate;
    const isLead = tourData.tour_guides?.some(
      (tg: TourGuide) => tg.user_id === authContext.user?.id,
    );
    canManageTour =
      isAdminRole(authContext.role) ||
      isLead ||
      tourData.created_by === authContext.user.id;
  }

  const [userContextResult, manageResult] = await Promise.all([
    authContext.user
      ? Promise.all([
          authContext.isParent
            ? supabase
                .from("child_profiles")
                .select("id, full_name, birthdate")
                .eq("parent_id", authContext.user.id)
                .eq("is_active", true)
            : Promise.resolve({ data: null }),
          supabase
            .from("tour_participants")
            .select("id, user_id, child_profile_id, status, waitlist_position")
            .eq("tour_id", id)
            .eq("user_id", authContext.user.id),
        ])
      : Promise.resolve(null),
    canManageTour
      ? Promise.all([
          supabase
            .from("tour_participants")
            .select(`
              id,
              status,
              user_id,
              child_profile_id,
              waitlist_position,
              age_override,
              created_at,
              profiles!tour_participants_user_id_fkey (
                full_name,
                phone,
                emergency_phone,
                medical_notes,
                birthdate
              ),
              child_profiles (
                full_name,
                medical_notes,
                birthdate,
                profiles!child_profiles_parent_id_fkey (
                  full_name
                )
              )
            `)
            .eq("tour_id", id),
          supabase
            .from("material_reservations")
            .select(`
              id, material_inventory_id, user_id, child_profile_id,
              material_inventory (
                id, size,
                material_types (name)
              )
            `)
            .eq("tour_id", id),
        ])
      : Promise.resolve(null),
  ]);

  if (userContextResult) {
    const [cRes, rRes] = userContextResult;
    childrenProfiles = cRes.data || [];
    userRegistrations = rRes.data || [];
  }

  let participants: TourParticipant[] = [];
  let reservations: Array<{
    id: string;
    material_id: string;
    user_id: string;
    child_profile_id: string | null;
    size?: string;
    materials: { name: string };
  }> = [];

  if (manageResult) {
    const [{ data: participantsData }, { data: reservationsData }] =
      manageResult;
    participants = (participantsData || []) as unknown as TourParticipant[];
    reservations = ((reservationsData || []) as ReservationQueryRow[]).map(
      (r) => ({
        id: r.id,
        material_id: r.material_inventory_id,
        user_id: r.user_id,
        child_profile_id: r.child_profile_id,
        size: r.material_inventory?.size ?? undefined,
        materials: {
          name: r.material_inventory?.material_types?.name || "Unbekannt",
        },
      }),
    );
  }

  const guides = (tour.tour_guides || []).map(
    (tg: TourGuide) => tg.profiles?.full_name || "Unbekannt",
  );
  const confirmedParticipantCount =
    ((countRows as TourParticipantCountRow[] | null)?.[0]?.confirmed_count ??
      participants.filter((p) => p.status === "confirmed").length) ||
    0;
  const isFull =
    (tourData.max_participants || 0) > 0 &&
    confirmedParticipantCount >= (tourData.max_participants || 0);

  const gLabel = (tour as TourGroupRelation).tour_groups?.group_name || null;
  const cLabel =
    (tour as TourCategoryRelation).tour_categorys?.category || "n.A.";

  return {
    tour: tourData,
    isLoggedIn,
    availableMaterials,
    reservations,
    childrenProfiles,
    userRegistrations,
    userBirthdate,
    canManageTour,
    guides,
    participants,
    confirmedParticipantCount,
    isFull,
    gLabel,
    cLabel,
  };
}

export default async function TourDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, supabase] = await Promise.all([params, createClient()]);

  const detailData = await getTourDetailData(id, supabase);
  if (!detailData) notFound();

  const {
    tour,
    isLoggedIn,
    availableMaterials,
    reservations,
    childrenProfiles,
    userRegistrations,
    userBirthdate,
    canManageTour,
    guides,
    participants,
    confirmedParticipantCount,
    isFull,
    gLabel,
    cLabel,
  } = detailData;

  return (
    <div className="mx-auto max-w-site px-4 py-8">
      <div className="mb-6 flex items-center justify-between text-sm print:hidden">
        <Link href="/touren" className="text-slate-500 hover:text-jdav-green">
          &larr; Zurück
        </Link>
        <div className="flex items-center gap-2">
          <CalendarExport
            title={tour.title}
            description={tour.description}
            startDate={tour.start_date}
            startTime={tour.meeting_time}
            meetingPoint={tour.meeting_point}
            durationHours={tour.duration_hours}
          />
          {canManageTour && (
            <div className="flex gap-2">
              <Link
                href={`/touren/${id}/edit`}
                className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                <Edit className="h-3.5 w-3.5" /> Bearbeiten
              </Link>
              <DeleteTourButton tourId={id} />
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200 print:shadow-none print:ring-0">
        <TourHero
          title={tour.title}
          targetArea={tour.target_area}
          guides={tour.tour_guides}
          status={tour.status}
          groupLabel={gLabel}
          isFull={isFull}
        />

        <div className="p-6 sm:p-10 text-slate-700">
          <TourInfoGrid
            startDate={tour.start_date}
            endDate={tour.end_date}
            categoryLabel={cLabel}
            difficulty={tour.difficulty}
            isFull={isFull}
            confirmedParticipantCount={confirmedParticipantCount}
            maxParticipants={tour.max_participants}
            distance={tour.distance}
            durationHours={tour.duration_hours}
            costInfo={tour.cost_info}
            minAge={tour.min_age}
          />

          <div className="space-y-8">
            <TourDetailsContent
              categoryLabel={cLabel}
              description={tour.description}
              meetingPoint={tour.meeting_point}
              meetingTime={tour.meeting_time}
              requirements={tour.requirements}
            />

            {canManageTour && (
              <section className="pt-10 border-t border-slate-100 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-slate-900">
                    Teilnehmer-Verwaltung
                  </h3>
                </div>

                <ParticipantManagement
                  tourId={tour.id}
                  tourTitle={tour.title}
                  tourDate={
                    tour.start_date
                      ? format(new Date(tour.start_date), "dd.MM.yyyy")
                      : "–"
                  }
                  meetingPoint={tour.meeting_point || "P&R Parkplatz"}
                  meetingTime={
                    tour.meeting_time
                      ? tour.meeting_time.substring(0, 5)
                      : "TBA"
                  }
                  maxParticipants={tour.max_participants || 0}
                  minAge={tour.min_age ?? null}
                  guides={guides}
                  participants={participants}
                  reservations={reservations}
                />
              </section>
            )}
          </div>

          <div className="mt-10 pt-8 border-t border-slate-200 print:hidden">
            <TourRegistrationSection
              tourId={tour.id}
              tourTitle={tour.title}
              tourStatus={tour.status}
              maxParticipants={tour.max_participants}
              minAge={tour.min_age || null}
              userBirthdate={userBirthdate}
              tourStartDate={tour.start_date}
              registrationDeadline={tour.registration_deadline}
              isLoggedIn={isLoggedIn}
              childrenProfiles={childrenProfiles}
              availableMaterials={availableMaterials}
              userRegistrations={userRegistrations}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
