import { format } from "date-fns";
import {
  Calendar,
  ChevronDown,
  FileEdit,
  LayoutDashboard,
  Mountain,
  PlusCircle,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { syncTourStatuses } from "@/app/actions/tour-management";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

interface GuideDashboardTour {
  id: string;
  status: string;
  title: string;
  start_date: string | null;
  max_participants: number | null;
  tour_participants?: Array<{ count: number | null }>;
  tour_reports?: Array<{ id: string }>;
  tour_categorys?: { category: string | null } | null;
}

type RawGuideDashboardTour = Omit<
  GuideDashboardTour,
  "tour_categorys" | "tour_reports"
> & {
  tour_categorys?:
    | { category: string | null }
    | { category: string | null }[]
    | null;
  tour_reports?: Array<{ id: string }> | { id: string } | null;
};

function normalizeTours(
  data: RawGuideDashboardTour[] | null,
): GuideDashboardTour[] {
  return (data || []).map((tour) => {
    const normalizedReports = Array.isArray(tour.tour_reports)
      ? tour.tour_reports
      : tour.tour_reports
        ? [tour.tour_reports]
        : [];

    return {
      ...tour,
      tour_reports: normalizedReports,
      tour_categorys: Array.isArray(tour.tour_categorys)
        ? (tour.tour_categorys[0] ?? null)
        : tour.tour_categorys,
    };
  });
}

export default async function GuideDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "guide" && profile.role !== "admin")) {
    redirect("/touren");
  }

  const isAdmin = profile.role === "admin";

  // Sync statuses based on dates
  await syncTourStatuses();

  // Fetch tours
  let tours: GuideDashboardTour[];
  const selectQuery =
    "id, status, title, start_date, max_participants, category, tour_participants(count), tour_reports(id), tour_categorys!tours_category_fkey(category)";

  if (isAdmin) {
    const { data } = await supabase
      .from("tours")
      .select(selectQuery)
      .order("start_date", { ascending: true });
    tours = normalizeTours(data as RawGuideDashboardTour[] | null);
  } else {
    const { data } = await supabase
      .from("tours")
      .select(`${selectQuery}, tour_guides!inner(user_id)`)
      .eq("tour_guides.user_id", user.id)
      .order("start_date", { ascending: true });
    tours = normalizeTours(data as RawGuideDashboardTour[] | null);
  }

  const statusMap: Record<string, { label: string; classes: string }> = {
    planning: { label: "Planung", classes: "bg-blue-100 text-blue-700" },
    open: { label: "Anmeldung offen", classes: "bg-green-100 text-green-700" },
    full: { label: "Ausgebucht", classes: "bg-amber-100 text-amber-700" },
    completed: {
      label: "Abgeschlossen",
      classes: "bg-slate-100 text-slate-600",
    },
  };

  // Filter for active vs archived
  const activeTours = tours.filter(
    (t) =>
      t.status !== "completed" ||
      !t.tour_reports ||
      t.tour_reports.length === 0,
  );

  const archivedTours = tours.filter(
    (t) =>
      t.status === "completed" && t.tour_reports && t.tour_reports.length > 0,
  );

  const TourItem = ({ tour }: { tour: GuideDashboardTour }) => (
    <div
      className={cn(
        "group overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:border-jdav-green hover:shadow-md",
        tour.status === "completed" &&
          (!tour.tour_reports || tour.tour_reports.length === 0)
          ? "border-red-500 shadow-md shadow-red-50/50"
          : "border-slate-200",
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                statusMap[tour.status]?.classes ||
                  "bg-slate-100 text-slate-600",
              )}
            >
              {statusMap[tour.status]?.label || tour.status}
            </span>
            <span className="text-xs text-slate-400 capitalize">
              {tour.tour_categorys?.category || "Tour"}
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-jdav-green transition-colors">
            {tour.title}
          </h3>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-jdav-green" />
              {tour.start_date
                ? format(new Date(tour.start_date), "dd.MM.yy")
                : "TBA"}
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-jdav-green" />
              {tour.tour_participants?.[0]?.count || 0} /{" "}
              {tour.max_participants || "∞"} Teilnehmer
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-4 sm:border-t-0 sm:pt-0">
          {tour.status === "completed" && (
            <Link
              href={
                tour.tour_reports && tour.tour_reports.length > 0
                  ? `/berichte/${tour.tour_reports[0].id}`
                  : `/touren/${tour.id}/bericht/neu`
              }
              className="flex-1 sm:flex-none"
            >
              <button
                type="button"
                className={cn(
                  "flex h-8 w-full items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors",
                  tour.tour_reports && tour.tour_reports.length > 0
                    ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    : "bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-200",
                )}
              >
                <FileEdit className="h-3.5 w-3.5" />
                {tour.tour_reports && tour.tour_reports.length > 0
                  ? "Bericht"
                  : "Bericht erstellen"}
              </button>
            </Link>
          )}
          <Link href={`/touren/${tour.id}`} className="flex-1 sm:flex-none">
            <button
              type="button"
              className="h-8 w-full rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Details
            </button>
          </Link>
          <Link
            href={`/touren/${tour.id}/edit`}
            className="flex-1 sm:flex-none"
          >
            <button
              type="button"
              className="h-8 w-full rounded-lg bg-jdav-green px-3 text-xs font-bold text-white hover:bg-jdav-green-dark transition-colors"
            >
              Bearbeiten
            </button>
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-jdav-green p-2 text-white shadow-sm">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {isAdmin ? "Admin Dashboard" : "Guide Dashboard"}
            </h1>
            <p className="text-sm text-slate-500">
              {isAdmin
                ? "Vollständige Tourenverwaltung"
                : "Deine Planung und Teilnehmer."}
            </p>
          </div>
        </div>
        <Link href="/touren/neu">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl bg-jdav-green-dark px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-jdav-green"
          >
            <PlusCircle className="h-4 w-4" /> Tour planen
          </button>
        </Link>
      </div>

      <div className="space-y-10">
        <section>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
            Aktuelle Touren
          </h2>
          <div className="grid gap-3">
            {activeTours.length > 0 ? (
              activeTours.map((tour) => <TourItem key={tour.id} tour={tour} />)
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center bg-slate-50/50">
                <Mountain className="mx-auto mb-4 h-12 w-12 text-slate-200" />
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                  Keine anstehenden Aufgaben
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Momentan sind keine aktiven Touren ohne Bericht vorhanden.
                </p>
              </div>
            )}
          </div>
        </section>

        {archivedTours.length > 0 && (
          <section>
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors list-none">
                <span className="flex items-center gap-2 underline underline-offset-4 decoration-slate-200">
                  Abgeschlossene Touren & Berichte ({archivedTours.length})
                </span>
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="grid gap-3 mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                {archivedTours.map((tour) => (
                  <TourItem key={tour.id} tour={tour} />
                ))}
              </div>
            </details>
          </section>
        )}
      </div>
    </div>
  );
}
