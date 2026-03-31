import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, MapPin, Mountain, MoveLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ParticipantPopup } from "@/components/reports/ParticipantPopup";
import { ReportForm } from "@/components/reports/ReportForm";
import { getTourParticipantsForListing } from "@/lib/reports/participants";
import { createClient } from "@/utils/supabase/server";

interface Props {
  params: Promise<{ id: string }>;
}

interface TourGuide {
  user_id: string | null;
}

export default async function NewReportPage({ params }: Props) {
  const { id: tourId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tour, error: tourError } = await supabase
    .from("tours")
    .select(`
      *,
      tour_guides (user_id),
      tour_reports (id)
    `)
    .eq("id", tourId)
    .single();

  if (tourError || !tour) redirect("/guide/dashboard");

  // Check if report already exists - we don't redirect anymore to prevent unmounting during background uploads
  // If it exists, we could ideally load it, but for now we just let the user create a new one or handle it via the UI
  // if (tour.tour_reports && tour.tour_reports.length > 0) {
  //   redirect(`/berichte/${tour.tour_reports[0].id}/edit`);
  // }

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

  const participants = await getTourParticipantsForListing(
    supabase,
    tourId,
    user.id,
  );

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/guide/dashboard"
            className="group flex items-center text-sm font-bold text-slate-500 transition-colors hover:text-jdav-green"
          >
            <MoveLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Zurück zum Dashboard
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
            Bericht erstellen
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Teile eure Erlebnisse und Fotos von der Tour.
          </p>
        </div>

        {/* Participant Popup for Guides/Admins */}
        {participants.length > 0 && (
          <ParticipantPopup participants={participants} />
        )}
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
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
          participants={participants}
        />
      </div>
    </div>
  );
}
