import { format, subMonths } from "date-fns";
import {
  Calendar,
  ChevronRight,
  LogOut,
  Mountain,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TourCard } from "@/components/tours/TourCard";
import { getCurrentUserProfile } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";

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
    .select(
      "*, tour_groups (group_name), tour_categorys!tours_category_fkey (category), tour_guides ( user_id, profiles ( full_name ) )"
    )
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

    const match = (countRows as TourParticipantCountRow[] | null)?.find(
      (r) => r.tour_id === nextTour.id,
    );

    nextTourWithCount = {
      ...nextTour,
      confirmed_count: match?.confirmed_count || 0,
    };
  }

  // Fetch only official news posts
  const { data: recentNews } = await supabase
    .from("news_posts")
    .select("id, title, content, published_at")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(3);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 pb-24">
      {/* Header section */}
      <div className="relative overflow-hidden bg-jdav-green p-6 pt-12 pb-16 text-white">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-100 mb-1">
              Servus, {displayName}
            </p>
            <h1 className="text-2xl font-black uppercase tracking-tight">
              Dein JDAV Dashboard
            </h1>
          </div>
        </div>
        <div className="absolute -right-10 -top-10 opacity-10">
          <Mountain className="h-48 w-48" />
        </div>
      </div>

      <div className="relative z-20 -mt-8 space-y-6 px-4">
        {/* Next Tour Section */}
        <section>
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="h-4 w-4 text-jdav-green" />
              Nächste Tour
            </h2>
            <Link
              href="/touren"
              className="text-xs font-bold text-jdav-green uppercase tracking-wider hover:underline"
            >
              Alle zeigen
            </Link>
          </div>

          {nextTourWithCount ? (
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
                <div className="prose prose-sm prose-slate mt-2 line-clamp-3">
                  <p>{news.content}</p>
                </div>
                <p className="mt-4 text-[10px] font-medium text-slate-500">
                  {new Date(news.published_at).toLocaleString("de-DE")}
                </p>
              </article>
            ))}

            {(!recentNews || recentNews.length === 0) && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-10 text-center text-slate-400 italic">
                <Mountain className="mx-auto mb-4 h-10 w-10 text-slate-200" />
                <p className="text-sm">Keine aktuellen News.</p>
              </div>
            )}
          </div>
        </section>
      </div>

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
