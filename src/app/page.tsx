import { format, subMonths } from "date-fns";
import {
  Calendar,
  ChevronRight,
  FileText,
  LogOut,
  Mountain,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ComponentProps } from "react";
import { TourCard } from "@/components/tours/TourCard";
import { SignOutForm } from "@/components/ui/SignOutForm";
import { getCurrentUserProfile } from "@/lib/auth";
import { siteConfig } from "@/lib/site-config";
import { loadNextConfirmedRegistration } from "@/lib/tours/registration-overview";
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

interface ReportImage {
  image_url: string;
  order_index: number | null;
}

interface NewsPost {
  id: string;
  title: string;
  content: string;
  published_at: string;
}

interface TourParticipantCountRow {
  tour_id: string;
  confirmed_count: number;
}

interface HomeReport {
  id: string;
  title: string;
  report_text: string;
  tours?: {
    title?: string | null;
    start_date?: string | null;
    tour_categorys?: { category: string | null } | null;
  } | null;
  report_images?: ReportImage[] | null;
}

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeHomeReports(rows: unknown[] | null): HomeReport[] {
  return ((rows || []) as Array<Record<string, unknown>>).map((row) => {
    const tour = normalizeRelation(
      row.tours as
        | {
            title?: string | null;
            start_date?: string | null;
            tour_categorys?:
              | { category: string | null }
              | { category: string | null }[]
              | null;
          }
        | {
            title?: string | null;
            start_date?: string | null;
            tour_categorys?:
              | { category: string | null }
              | { category: string | null }[]
              | null;
          }[]
        | null,
    );

    return {
      id: row.id as string,
      title: row.title as string,
      report_text: (row.report_text as string) || "",
      tours: tour
        ? {
            title: tour.title,
            start_date: tour.start_date,
            tour_categorys: normalizeRelation(tour.tour_categorys),
          }
        : null,
      report_images: (row.report_images as ReportImage[] | null) || null,
    };
  });
}

const TOUR_CARD_SELECT = `
  id,
  title,
  status,
  start_date,
  end_date,
  target_area,
  max_participants,
  difficulty,
  tour_groups (group_name),
  tour_categorys!tours_category_fkey (category),
  tour_guides (
    user_id,
    profiles (
      full_name
    )
  )
`;

function normalizeTourCard(tour: RawTourCardItem | null): TourCardItem | null {
  if (!tour) return null;

  return {
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
  };
}

/**
 * The main Dashboard / Startseite of the application.
 * Displays the user's next confirmed tour (or the next upcoming open tour),
 * recent club news, and the latest tour reports.
 */
export default async function Home() {
  const [{ fullName, role, user }, supabase] = await Promise.all([
    getCurrentUserProfile(),
    createClient(),
  ]);

  if (!user) {
    return redirect("/login");
  }

  const today = new Date().toISOString().split("T")[0];
  const twoMonthsAgo = subMonths(new Date(), 2).toISOString();

  const [
    nextConfirmedRegistration,
    nextTourResult,
    recentReportsResult,
    recentNewsResult,
  ] = await Promise.all([
    loadNextConfirmedRegistration(supabase, user.id, role === "parent"),
    supabase
      .from("tours")
      .select(TOUR_CARD_SELECT)
      .gte("end_date", today)
      .neq("status", "completed")
      .neq("status", "cancelled")
      .order("start_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("tour_reports")
      .select(`
        id,
        title,
        report_text,
        tours (
          title,
          start_date,
          tour_categorys!tours_category_fkey (category)
        ),
        report_images (image_url, order_index)
      `)
      .gte("created_at", twoMonthsAgo)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("news_posts")
      .select("id, title, content, published_at")
      .order("published_at", { ascending: false })
      .limit(4),
  ]);

  const { data: nextTourData } = nextTourResult;
  const recentReports = normalizeHomeReports(
    recentReportsResult.data as unknown[] | null,
  );
  const { data: recentNews } = recentNewsResult;

  const nextTour = normalizeTourCard(nextTourData as RawTourCardItem | null);
  const confirmedTour = nextConfirmedRegistration
    ? normalizeTourCard(nextConfirmedRegistration.tour as RawTourCardItem)
    : null;

  const tourIdForCount = confirmedTour?.id ?? nextTour?.id ?? null;

  let featuredTour: TourCardItem | null = confirmedTour ?? nextTour;
  if (tourIdForCount && featuredTour) {
    const { data: countRows } = await supabase.rpc(
      "get_tour_participant_counts",
      {
        p_tour_ids: [tourIdForCount],
      },
    );
    const row = (countRows as TourParticipantCountRow[] | null)?.[0];
    featuredTour = {
      ...featuredTour,
      confirmed_participants_count: row?.confirmed_count || 0,
    };
  }

  const featuredTitle = confirmedTour
    ? "Deine nächste bestätigte Tour"
    : "Deine nächste Tour";
  const featuredLink = confirmedTour ? "/touren/meine" : "/touren";

  const displayName = fullName || user.email?.split("@")[0];

  return (
    <div className="mx-auto max-w-site px-4 py-8">
      <div className="mb-10 lg:mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Servus, {displayName}!
        </h1>
        <p className="mt-2 text-slate-500">
          Willkommen im Mitgliederbereich der Sektion {siteConfig.sectionName}
        </p>
      </div>

      <div className="space-y-12">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Calendar className="h-5 w-5 text-jdav-green" /> Deine nächste
              Tour
            </h2>
            <Link
              href={featuredLink}
              className="text-xs font-bold text-jdav-green-dark uppercase tracking-wider hover:underline"
            >
              Zu meinen Touren
            </Link>
          </div>

          {featuredTour ? (
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-jdav-green-dark">
                {featuredTitle}
              </div>
              <TourCard tour={featuredTour} />
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 border-dashed p-8 text-center bg-slate-50/50">
              <p className="text-sm text-slate-400 italic">
                Aktuell sind keine Touren geplant.
              </p>
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xl font-bold text-slate-900">Neuigkeiten</h2>
            <Link
              href="/berichte"
              className="text-xs font-bold text-jdav-green-dark uppercase tracking-wider hover:underline"
            >
              Alle Berichte
            </Link>
          </div>

          <div className="space-y-4">
            {(recentNews as NewsPost[] | null)?.map((news) => (
              <article
                key={news.id}
                className="rounded-2xl border border-green-200 bg-green-50 p-5"
              >
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-jdav-green">
                  Vereinsnews
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {news.title}
                </h3>
                <p className="mt-2 text-sm text-slate-700 line-clamp-3">
                  {news.content}
                </p>
                <p className="mt-2 text-[10px] text-slate-500">
                  {new Date(news.published_at).toLocaleString("de-DE")}
                </p>
              </article>
            ))}

            {recentReports.length > 0 ? (
              recentReports.map((report) => {
                const previewImage = report.report_images?.sort(
                  (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
                )?.[0]?.image_url;
                return (
                  <Link
                    key={report.id}
                    href={`/berichte/${report.id}`}
                    className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-jdav-green hover:shadow-md"
                  >
                    <div className="flex flex-col sm:flex-row">
                      <div className="relative aspect-video w-full sm:w-40 sm:aspect-square shrink-0 overflow-hidden bg-slate-100">
                        {previewImage ? (
                          <Image
                            src={previewImage}
                            alt={report.title}
                            fill
                            sizes="(max-width: 640px) 100vw, 160px"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-300">
                            <Mountain className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-jdav-green">
                          <FileText className="h-3 w-3" /> Tourenbericht
                        </div>
                        <h3 className="mb-1 text-lg font-bold text-slate-900 group-hover:text-jdav-green leading-snug">
                          {report.title}
                        </h3>
                        <div className="mb-2 text-[10px] text-slate-400 font-medium">
                          {report.tours?.tour_categorys?.category || "Tour"}
                        </div>
                        <p className="mb-3 line-clamp-2 text-sm text-slate-500">
                          {report.report_text.replace(/[#*`_]/g, "")}
                        </p>
                        <div className="mt-auto flex items-center justify-between border-t border-slate-50 pt-3">
                          <span className="text-[10px] font-medium text-slate-400">
                            {report.tours?.title} –{" "}
                            {report.tours?.start_date
                              ? format(
                                  new Date(report.tours.start_date),
                                  "dd.MM.yy",
                                )
                              : ""}
                          </span>
                          <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-10 text-center text-slate-400 italic">
                <Mountain className="mx-auto mb-4 h-10 w-10 text-slate-200" />
                <p className="text-sm">Keine aktuellen Berichte verfügbar.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="mt-16 flex justify-center border-t border-slate-100 pt-8">
        <SignOutForm>
          <button
            type="submit"
            className="group flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest"
            aria-label="Abmelden"
          >
            <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Abmelden
          </button>
        </SignOutForm>
      </div>
    </div>
  );
}
