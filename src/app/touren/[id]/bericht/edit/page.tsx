import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, MapPin, Mountain, MoveLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTourParticipantsForListing } from "@/app/actions/reports";
import { ReportForm } from "@/components/reports/ReportForm";
import { createClient } from "@/utils/supabase/server";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface TourGuide {
  user_id: string | null;
}

export default async function EditReportPage({ params, searchParams }: Props) {
  const { id: tourId } = await params;
  const sParams = await searchParams;
  const reportId = sParams.id as string;

  if (!reportId) redirect("/guide/dashboard");

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tour, error: tourError } = await supabase
    .from("tours")
    .select(`
      *,
      tour_guides (user_id)
    `)
    .eq("id", tourId)
    .single();

  const { data: report, error: reportError } = await supabase
    .from("tour_reports")
    .select(`
      *,
      report_images (id, image_url, order_index)
    `)
    .eq("id", reportId)
    .single();

  if (tourError || !tour || reportError || !report)
    redirect("/guide/dashboard");

  // Permission check
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isGuide = (tour.tour_guides as TourGuide[] | undefined)?.some(
    (tg) => tg.user_id === user.id,
  );
  const isAdmin = profile?.role === "admin";

  if (!isGuide && !isAdmin) {
    redirect("/guide/dashboard");
  }

  const participants = await getTourParticipantsForListing(tourId);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={`/berichte/${reportId}`}
            className="group flex items-center text-sm font-bold text-slate-500 transition-colors hover:text-jdav-green"
          >
            <MoveLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Zurück zum Bericht
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
            Bericht bearbeiten
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Aktualisiere den Text oder die Bilder deines Berichts.
          </p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2 md:grid-cols-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-jdav-green/10 p-2 text-jdav-green">
            <Mountain className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Tour
            </p>
            <p className="font-bold text-slate-900 truncate">{tour.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-jdav-green/10 p-2 text-jdav-green">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Datum
            </p>
            <p className="font-bold text-slate-900">
              {tour.start_date
                ? format(new Date(tour.start_date), "dd. MMMM yyyy", {
                    locale: de,
                  })
                : "TBA"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-jdav-green/10 p-2 text-jdav-green">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Gebiet
            </p>
            <p className="font-bold text-slate-900">
              {tour.target_area || "n.A."}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <ReportForm
          tourId={tourId}
          tourTitle={tour.title}
          initialData={report}
          participants={participants}
        />
      </div>
    </div>
  );
}
