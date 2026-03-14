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
import { TourRegistrationSection } from "@/components/tours/TourRegistrationSection";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

interface AvailableMaterial {
  id: string;
  name: string;
}

interface TourMaterialRow {
  materials: AvailableMaterial[] | null;
}

interface ChildProfileOption {
  id: string;
  full_name: string;
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
  created_at?: string | null;
  profiles?: {
    full_name?: string | null;
    phone?: string | null;
    emergency_phone?: string | null;
    medical_notes?: string | null;
  } | null;
  child_profiles?: {
    full_name?: string | null;
    medical_notes?: string | null;
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

const groupLabel = (group: string) => {
  if (group === "family") return "Familie";
  if (group === "youth") return "Jugend";
  return null;
};

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

const getMedicalNotesTitle = (reg: TourParticipant): string | undefined => {
  const notes = reg.child_profiles?.medical_notes ?? reg.profiles?.medical_notes;
  return notes ?? undefined;
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
        created_at,
        profiles!tour_participants_user_id_fkey (
          full_name,
          phone,
          emergency_phone,
          medical_notes
        ),
        child_profiles (
          full_name,
          medical_notes
        )
      )
    `)
    .eq("id", id)
    .single();

  if (error || !tour) notFound();
  const tourData = tour as typeof tour & TourDetailUiState;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  const isLoggedIn = !userError && !!user;

  const { data: tmData } = await supabase
    .from("tour_materials")
    .select("material_id, materials(id, name)")
    .eq("tour_id", id);
  const availableMaterials =
    tmData?.flatMap((tm) => ((tm as TourMaterialRow).materials ?? [])) || [];

  let childrenProfiles: ChildProfileOption[] = [];
  let userRegistrations: UserRegistration[] = [];
  let userBirthdate: string | null = null;

  if (isLoggedIn && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, birthdate")
      .eq("id", user.id)
      .single();

    userBirthdate = profile?.birthdate || null;

    if (profile?.role === "parent") {
      const { data: cData } = await supabase
        .from("child_profiles")
        .select("id, full_name")
        .eq("parent_id", user.id);
      childrenProfiles = cData || [];
    }

    const { data: rData } = await supabase
      .from("tour_participants")
      .select("id, user_id, child_profile_id, status, waitlist_position")
      .eq("tour_id", id)
      .eq("user_id", user.id);
    userRegistrations = rData || [];

    const userRole = profile?.role;
    const isLead = tourData.tour_guides?.some(
      (tg: TourGuide) => tg.profiles?.id === user.id,
    );
    tourData.canManage =
      userRole === "admin" || isLead || tourData.created_by === user.id;
    tourData.userRole = userRole;
  }

  const participants = (tourData.tour_participants || []) as TourParticipant[];
  const activeParticipants = participants.filter(
    (p) => p.status !== "cancelled",
  );
  const confirmedParticipants = participants.filter(
    (p) => p.status === "confirmed",
  );
  const cancelledParticipants = participants.filter(
    (p) => p.status === "cancelled",
  );
  const isFull =
    (tourData.max_participants || 0) > 0 &&
    confirmedParticipants.length >= (tourData.max_participants || 0);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Bestätigt";
      case "cancelled":
        return "Abgelehnt";
      case "waitlist":
        return "Warteliste";
      case "pending":
        return "Offen";
      default:
        return status;
    }
  };

  const gLabel = tour.group ? groupLabel(tour.group) : null;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between text-sm">
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

      <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200">
        {/* HERO */}
        <div className="bg-jdav-green p-8 sm:p-12 text-center text-white relative">
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
                    key={tg.user_id || tg.profiles?.id || `${tg.profiles?.full_name || "guide"}-${idx}`}
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 mb-8">
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
                {tour.category || "n.A."}
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
                {confirmedParticipants.length} / {tour.max_participants || "∞"}
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
            <section>
              <h3 className="mb-3 text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
                Beschreibung
              </h3>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap">
                {tour.description || "Keine Beschreibung vorhanden."}
              </div>
            </section>

            {/* Meeting Point + Requirements */}
            <section className="grid gap-6 sm:grid-cols-2">
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

            {/* Guide Management Table */}
            {tourData.canManage && (
              <section className="pt-10 border-t border-slate-100 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-slate-900">
                    Teilnehmer-Verwaltung
                  </h3>
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                    {activeParticipants.length} Anmeldungen
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-tighter">
                      <tr>
                        <th className="px-4 py-4 font-bold border-b border-slate-200">
                          Name
                        </th>
                        <th className="px-4 py-4 font-bold border-b border-slate-200">
                          Anmeldung
                        </th>
                        <th className="px-4 py-4 font-bold border-b border-slate-200">
                          Notfall / Kontakt
                        </th>
                        <th className="px-4 py-4 font-bold border-b border-slate-200">
                          Hinweise
                        </th>
                        <th className="px-4 py-4 font-bold border-b border-slate-200">
                          Status
                        </th>
                        <th className="px-4 py-4 font-bold border-b border-slate-200 text-right">
                          Aktionen
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeParticipants.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-10 text-center text-slate-400 italic"
                          >
                            Noch keine Anmeldungen vorhanden.
                          </td>
                        </tr>
                      )}
                      {activeParticipants.map((reg) => (
                        <tr
                          key={reg.id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-4 py-4 font-bold text-slate-900">
                            {reg.child_profiles?.full_name ||
                              reg.profiles?.full_name ||
                              "Unbekannt"}
                            {reg.child_profiles && (
                              <span className="ml-2 bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[8px] uppercase">
                                Kind
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-slate-500">
                            {reg.created_at
                              ? format(
                                  new Date(reg.created_at),
                                  "dd.MM.yy HH:mm",
                                )
                              : "–"}
                          </td>
                          <td className="px-4 py-4 text-slate-600">
                            <div className="space-y-0.5">
                              {reg.profiles?.phone && (
                                <p className="flex items-center gap-1">
                                  <span className="opacity-50 text-[10px]">
                                    P:
                                  </span>{" "}
                                  {reg.profiles.phone}
                                </p>
                              )}
                              {reg.profiles?.emergency_phone && (
                                <p className="flex items-center gap-1 font-bold text-red-600">
                                  <span className="opacity-50 text-[10px]">
                                    SOS:
                                  </span>{" "}
                                  {reg.profiles.emergency_phone}
                                </p>
                              )}
                            </div>
                          </td>
                          <td
                            className="px-4 py-4 text-slate-500 max-w-37.5 truncate"
                            title={getMedicalNotesTitle(reg)}
                          >
                            {reg.child_profiles?.medical_notes ||
                              reg.profiles?.medical_notes ||
                              "–"}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter",
                                reg.status === "confirmed"
                                  ? "bg-jdav-green/10 text-jdav-green"
                                  : reg.status === "waitlist"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-100 text-slate-600",
                              )}
                            >
                              {getStatusLabel(reg.status)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {reg.status !== "confirmed" && (
                                <form
                                  action={async () => {
                                    "use server";
                                    const { updateParticipantStatus } =
                                      await import(
                                        "@/app/actions/participant-management"
                                      );
                                    await updateParticipantStatus(
                                      reg.id,
                                      "confirmed",
                                    );
                                  }}
                                >
                                  <button
                                    type="submit"
                                    className="bg-jdav-green/10 hover:bg-jdav-green text-jdav-green hover:text-white transition-all px-2 py-1 rounded-md font-bold text-[10px] uppercase"
                                  >
                                    Bestätigen
                                  </button>
                                </form>
                              )}
                              <form
                                action={async () => {
                                  "use server";
                                  const { updateParticipantStatus } =
                                    await import(
                                      "@/app/actions/participant-management"
                                    );
                                  await updateParticipantStatus(
                                    reg.id,
                                    "cancelled",
                                  );
                                }}
                              >
                                <button
                                  type="submit"
                                  className="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white transition-all px-2 py-1 rounded-md font-bold text-[10px] uppercase"
                                >
                                  Ablehnen
                                </button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {cancelledParticipants.length > 0 && (
                  <details className="group rounded-2xl border border-slate-100 bg-slate-50/50">
                    <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-bold text-slate-500 hover:text-slate-700 transition-colors">
                      <span className="text-xs uppercase tracking-widest">
                        Abgelehnte / Stornierte ({cancelledParticipants.length})
                      </span>
                      <span className="text-xl transition-transform group-open:rotate-180 opacity-30">
                        &darr;
                      </span>
                    </summary>
                    <div className="p-4 pt-0">
                      <table className="w-full text-left text-[10px] text-slate-400">
                        <tbody className="divide-y divide-slate-100">
                          {cancelledParticipants.map((reg) => (
                            <tr key={reg.id}>
                              <td className="py-2 font-medium">
                                {reg.child_profiles?.full_name ||
                                  reg.profiles?.full_name}
                              </td>
                              <td className="py-2 text-right">
                                <form
                                  action={async () => {
                                    "use server";
                                    const { updateParticipantStatus } =
                                      await import(
                                        "@/app/actions/participant-management"
                                      );
                                    await updateParticipantStatus(
                                      reg.id,
                                      "pending",
                                    );
                                  }}
                                >
                                  <button
                                    type="submit"
                                    className="hover:underline font-bold uppercase tracking-tighter"
                                  >
                                    Wiederherstellen
                                  </button>
                                </form>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}
              </section>
            )}
          </div>

          {/* Registration Section */}
          <div className="mt-10 pt-8 border-t border-slate-200">
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
