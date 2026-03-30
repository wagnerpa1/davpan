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
import { TourCard } from "@/components/tours/TourCard";
import { getCurrentUserProfile } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";

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

export default async function Home() {
  const [{ fullName, user }, supabase] = await Promise.all([
    getCurrentUserProfile(),
    createClient(),
  ]);

  if (!user) {
    return redirect("/login");
  }

  const displayName = fullName || user.email?.split("@")[0];

  // Fetch only the single next upcoming or currently running tour
  const today = new Date().toISOString().split("T")[0];
  const { data: nextTour } = await supabase
    .from("tours")
    .select(`
      *,
      tour_groups (group_name),
      tour_categorys!tours_category_fkey (category),
      tour_guides (
        user_id,
        profiles (
          full_name
        )
      )
    `)
    .gte("end_date", today) // Keep showing until it ends
    .neq("status", "completed")
    .order("start_date", { ascending: true })
    .limit(1)
    .single();

  let nextTourWithCount = nextTour;
  if (nextTour?.id) {
    const { data: countRows } = await supabase.rpc(
      "get_tour_participant_counts",
      {
        p_tour_ids: [nextTour.id],
      },
    );
    const row = (countRows as TourParticipantCountRow[] | null)?.[0];
    nextTourWithCount = {
      ...nextTour,
      confirmed_participants_count: row?.confirmed_count || 0,
    };
  }

  // Fetch recent reports (max 5, max 2 months old)
  const twoMonthsAgo = subMonths(new Date(), 2).toISOString();
  const { data: recentReports } = await supabase
    .from("tour_reports")
    .select(`
      *,
      tours (
        title, 
        start_date,
        tour_categorys!tours_category_fkey (category)
      ),
      report_images (image_url, order_index)
    `)
    .gte("created_at", twoMonthsAgo)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: recentNews } = await supabase
    .from("news_posts")
    .select("id, title, content, published_at")
    .order("published_at", { ascending: false })
    .limit(4);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-10 lg:mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Servus, {displayName}!
        </h1>
        <p className="mt-2 text-slate-500">
          Willkommen im Mitgliederbereich der Sektion Pfarrkirchen
        </p>
      </div>

      <div className="space-y-12">
        {/* Next Tour Section */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-jdav-green" /> Deine nächste
              Tour
            </h2>
          </div>

          {nextTour ? (
            <TourCard tour={nextTourWithCount} />
          ) : (
            <div className="rounded-2xl border border-slate-200 border-dashed p-8 text-center bg-slate-50/50">
              <p className="text-sm text-slate-400 italic">
                Aktuell sind keine Touren geplant.
              </p>
            </div>
          )}
        </section>

        {/* Vereinsfeed Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xl font-bold text-slate-900">Neuigkeiten</h2>
            <Link
              href="/berichte"
              className="text-xs font-bold text-jdav-green uppercase tracking-wider hover:underline"
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

            {recentReports && recentReports.length > 0 ? (
              recentReports.map((report) => {
                const previewImage = (
                  report.report_images as ReportImage[]
                )?.sort(
                  (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
                )?.[0]?.image_url;
                return (
                  <Link
                    key={report.id}
                    href={`/berichte/${report.id}`}
                    className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:border-jdav-green hover:shadow-md"
                  >
                    <div className="flex flex-col sm:flex-row">
                      <div className="relative aspect-[16/9] w-full sm:w-40 sm:aspect-square shrink-0 overflow-hidden bg-slate-100">
                        {previewImage ? (
                          <Image
                            src={previewImage}
                            alt={report.title}
                            fill
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

      {/* Development tool to sign out */}
      <div className="mt-16 flex justify-center border-t border-slate-100 pt-8">
        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className="group flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-red-500 transition-all uppercase tracking-widest"
          >
            <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Abmelden
          </button>
        </form>
      </div>
    </div>
  );
}
