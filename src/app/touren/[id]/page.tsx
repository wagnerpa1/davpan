import { format } from "date-fns";
import {
  Baby,
  Calendar,
  Clock,
  Edit,
  Euro,
  MapPin,
  Mountain,
  Ruler,
  ShieldCheck,
  Tag,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteTourButton } from "@/components/tours/DeleteTourButton";
import { ParticipantManagement } from "@/components/tours/ParticipantManagement";
import { TourRegistrationSection } from "@/components/tours/TourRegistrationSection";
import { getCurrentUserProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

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
  waitlist_position?: number | null;
  age_override?: boolean;
  created_at?: string | null;
  profiles?: {
    full_name?: string | null;
    phone?: string | null;
    emergency_phone?: string | null;
    medical_notes?: string | null;
    birthdate?: string | null;
  } | null;
  child_profiles?: {
    full_name?: string | null;
    medical_notes?: string | null;
    birthdate?: string | null;
    profiles?: {
      full_name?: string | null;
    } | null;
  } | null;
}

interface TourDetailUiState {
  created_by: string;
  max_participants?: number | null;
  group?: string | null;
  status: string;
  tour_guides?: TourGuide[];
  tour_participants?: TourParticipant[];
  canManage?: boolean;
  userRole?: string | null;
}

interface TourMaterialInventory {
  size: string | null;
  quantity_available: number;
}

interface TourMaterialType {
  id: string;
  name: string;
  inventory: TourMaterialInventory[];
}

interface TourMaterialRequirementRow {
  material_types: TourMaterialType | null;
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

const statusLabel = (status: string) => {
  switch (status) {
    case "planning":
      return "In Planung";
    case "open":
      return "Anmeldung offen";
    case "full":
      return "Ausgebucht";
    case "completed":
      return "Abgeschlossen";
    default:
      return status;
  }
};

export default async function TourDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tour, error } = await supabase
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
      tour_participants (
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
      ),
      tour_groups!tours_group_fkey (
        group_name
      ),
      tour_categorys!tours_category_fkey (
        category
      )
    `)
    .eq("id", id)
    .single();

  if (error || !tour) notFound();
  const tourData = tour as typeof tour & TourDetailUiState;

  const authContext = await getCurrentUserProfile();
  const isLoggedIn = !!authContext.user;

  const { data: tmData } = await supabase
    .from("tour_material_requirements")
    .select(`
      material_type_id,
      material_types(
        id,
        name,
        inventory:material_inventory(id, size, quantity_available)
      )
    `)
    .eq("tour_id", id);

  const materialMap = new Map<string, AvailableMaterial>();
  (tmData as TourMaterialRequirementRow[] | null)?.forEach((row) => {
    const type = row.material_types;
    if (type?.inventory) {
      const sizes: string[] = [];
      type.inventory.forEach((inv) => {
        if (inv.quantity_available > 0 && inv.size) {
          if (!sizes.includes(inv.size)) sizes.push(inv.size);
        }
      });
      // Fallback for types without specific inventory sizes but still required
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

  const { data: reservationsData } = await supabase
    .from("material_reservations")
    .select(`
      id, material_inventory_id, user_id, child_profile_id,
      material_inventory (
        id, size,
        material_types (name)
      )
    `)
    .eq("tour_id", id);
  // Map back to expected structure (size, materials(name))
  const reservations = ((reservationsData || []) as ReservationQueryRow[]).map(
    (r) => ({
      id: r.id,
      material_id: r.material_inventory_id, // the frontend component probably expects material_id
      user_id: r.user_id,
      child_profile_id: r.child_profile_id,
      size: r.material_inventory?.size ?? undefined,
      materials: {
        name: r.material_inventory?.material_types?.name || "Unbekannt",
      },
    }),
  );

  let childrenProfiles: ChildProfileOption[] = [];
  let userRegistrations: UserRegistration[] = [];
  let userBirthdate: string | null = null;

  if (authContext.user) {
    userBirthdate = authContext.birthdate;

    if (authContext.role === "parent") {
      const { data: cData } = await supabase
        .from("child_profiles")
        .select("id, full_name, birthdate")
        .eq("parent_id", authContext.user.id);
      childrenProfiles = cData || [];
    }

    const { data: rData } = await supabase
      .from("tour_participants")
      .select("id, user_id, child_profile_id, status, waitlist_position")
      .eq("tour_id", id)
      .eq("user_id", authContext.user.id);
    userRegistrations = rData || [];

    const userRole = authContext.role;
    const isLead = tourData.tour_guides?.some(
      (tg: TourGuide) => tg.user_id === authContext.user?.id,
    );
    tourData.canManage =
      userRole === "admin" ||
      isLead ||
      tourData.created_by === authContext.user.id;
    tourData.userRole = userRole;
  }

  const guides = (tour.tour_guides || []).map(
    (tg: TourGuide) => tg.profiles?.full_name || "Unbekannt",
  );
  const participants = (tourData.tour_participants || []) as TourParticipant[];
  const { data: countRows } = await supabase.rpc(
    "get_tour_participant_counts",
    {
      p_tour_ids: [id],
    },
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

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between text-sm print:hidden">
        <Link href="/touren" className="text-slate-500 hover:text-jdav-green">
          &larr; Zurück
        </Link>
        {tourData.canManage && (
          <div className="flex gap-2">
            <Link href={`/touren/${id}/edit`}>
              <button
                type="button"
                className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                <Edit className="h-3.5 w-3.5" /> Bearbeiten
              </button>
            </Link>
            <DeleteTourButton tourId={id} />
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200 print:shadow-none print:ring-0">
        {/* HERO */}
        <div className="bg-jdav-green p-8 sm:p-12 text-center text-white relative print:hidden">
          <h1 className="mb-2 text-3xl font-black tracking-tight sm:text-5xl">
            {tour.title}
          </h1>
          <p className="text-lg font-medium opacity-90">
            {tour.target_area || "JDAV Pfarrkirchen"}
          </p>

          {/* Guides */}
          {tour.tour_guides && tour.tour_guides.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm font-medium">
              <div className="flex items-center gap-1.5 text-white/90">
                <span className="opacity-70 font-normal">Leitung:</span>
                {tour.tour_guides.map((tg: TourGuide, idx: number) => (
                  <span
                    key={
                      tg.user_id ||
                      tg.profiles?.id ||
                      `${tg.profiles?.full_name || "guide"}-${idx}`
                    }
                    className="bg-white/10 px-2 py-0.5 rounded-lg"
                  >
                    {tg.profiles?.full_name || "Tourenleitung"}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Status & Group Badges — below guides */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              {statusLabel(tour.status)}
            </div>
            {gLabel && (
              <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                {gLabel}
              </div>
            )}
            {isFull && (
              <div className="bg-red-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg animate-pulse">
                Warteliste aktiv
              </div>
            )}
          </div>
        </div>

        <div className="p-6 sm:p-10 text-slate-700">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 mb-8 print:hidden">
            <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 text-center">
              <Calendar className="mb-2 h-6 w-6 text-jdav-green" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Datum
              </span>
              <span className="mt-1 font-medium text-sm">
                {tour.start_date
                  ? tour.end_date && tour.start_date !== tour.end_date
                    ? `${format(new Date(tour.start_date), "dd.MM.")} – ${format(new Date(tour.end_date), "dd.MM.yy")}`
                    : format(new Date(tour.start_date), "dd.MM.yy")
                  : "TBA"}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 text-center">
              <Tag className="mb-2 h-6 w-6 text-jdav-green" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Kategorie
              </span>
              <span className="mt-1 font-medium text-sm capitalize">
                {cLabel}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 text-center">
              <Mountain className="mb-2 h-6 w-6 text-jdav-green" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Schwierigkeit
              </span>
              <span className="mt-1 font-medium text-sm">
                {tour.difficulty || "Keine"}
              </span>
            </div>
            <div
              className={cn(
                "flex flex-col items-center justify-center rounded-2xl p-4 text-center",
                isFull ? "bg-red-50" : "bg-slate-50",
              )}
            >
              <Users
                className={cn(
                  "mb-2 h-6 w-6",
                  isFull ? "text-red-500" : "text-jdav-green",
                )}
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Plätze
              </span>
              <span
                className={cn(
                  "mt-1 font-medium text-sm",
                  isFull && "text-red-600 font-black",
                )}
              >
                {confirmedParticipantCount} / {tour.max_participants || "∞"}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 text-center">
              <Ruler className="mb-2 h-6 w-6 text-jdav-green" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Strecke
              </span>
              <span className="mt-1 font-medium text-sm">
                {tour.distance ? `${tour.distance} km` : "–"}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 text-center">
              <Clock className="mb-2 h-6 w-6 text-jdav-green" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Gehzeit
              </span>
              <span className="mt-1 font-medium text-sm">
                {tour.duration_hours ? `${tour.duration_hours} h` : "–"}
              </span>
            </div>
            {tour.cost_info && (
              <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 text-center">
                <Euro className="mb-2 h-6 w-6 text-jdav-green" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Kosten
                </span>
                <span className="mt-1 font-medium text-sm line-clamp-2">
                  {tour.cost_info}
                </span>
              </div>
            )}
            {tour.min_age && (
              <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 text-center">
                <Baby className="mb-2 h-6 w-6 text-jdav-green" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Mindestalter
                </span>
                <span className="mt-1 font-medium text-sm">
                  {tour.min_age} Jahre
                </span>
              </div>
            )}
          </div>

          <div className="space-y-8">
            {/* Description */}
            <section className="print:hidden">
              <h3 className="mb-2 text-lg font-bold text-slate-900 group-hover:text-jdav-green leading-snug">
                Beschreibung
              </h3>
              <div className="mb-2 text-[10px] text-slate-400 font-medium">
                {(tour as TourCategoryRelation).tour_categorys?.category ||
                  "Tour"}
              </div>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap">
                {tour.description || "Keine Beschreibung vorhanden."}
              </div>
            </section>

            {/* Meeting Point + Requirements */}
            <section className="grid gap-6 sm:grid-cols-2 print:hidden">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <h4 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
                  <MapPin className="h-5 w-5 text-jdav-green" /> Treffpunkt
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {tour.meeting_point || "P&R Parkplatz Pfarrkirchen"} <br />
                  <span className="font-bold text-jdav-green">
                    {tour.meeting_time
                      ? `Um ${tour.meeting_time.substring(0, 5)} Uhr`
                      : "Zeit noch unklar"}
                  </span>
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <h4 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
                  <ShieldCheck className="h-5 w-5 text-jdav-green" />{" "}
                  Voraussetzungen
                </h4>
                <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {tour.requirements || "Keine besonderen Voraussetzungen."}
                </div>
              </div>
            </section>

            {/* Guide Management - Interactive Client Component */}
            {tourData.canManage && (
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

          {/* Registration Section */}
          <div className="mt-10 pt-8 border-t border-slate-200 print:hidden">
            <TourRegistrationSection
              tourId={tour.id}
              tourTitle={tour.title}
              tourStatus={tour.status}
              maxParticipants={tour.max_participants}
              minAge={tour.min_age || null}
              userBirthdate={userBirthdate}
              tourStartDate={tour.start_date}
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
