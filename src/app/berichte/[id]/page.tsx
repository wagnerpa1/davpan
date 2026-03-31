import { format } from "date-fns";
import {
  ArrowRight,
  ChevronLeft,
  Edit3,
  MapPin,
  Mountain,
  Ruler,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { ParticipantPopup } from "@/components/reports/ParticipantPopup";
import { ReportGallery } from "@/components/reports/ReportGallery";
import { Button } from "@/components/ui/button";
import { getTourParticipantsForListing } from "@/lib/reports/participants";
import { createClient } from "@/utils/supabase/server";

interface Props {
  params: Promise<{ id: string }>;
}

interface ReportImage {
  id: string;
  image_url: string;
  order_index: number | null;
}

interface TourGuide {
  user_id: string | null;
}

export default async function ReportDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Fetch report with author and tour details
  const { data: report, error } = await supabase
    .from("tour_reports")
    .select(`
      *,
      profiles:created_by (full_name),
      tours (
        id,
        title,
        difficulty,
        target_area,
        start_date,
        elevation,
        distance,
        tour_guides (user_id),
        tour_categorys!tours_category_fkey(category)
      ),
      report_images (id, image_url, order_index)
    `)
    .eq("id", id)
    .single();

  if (error || !report) {
    notFound();
  }

  const allImages =
    (report.report_images as ReportImage[])?.sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
    ) || [];

  const bannerImage = allImages[0];
  const galleryImages = allImages; // We show all images in the gallery as well for the lightbox

  const guides = (report.tours?.tour_guides as TourGuide[] | undefined) || [];

  const { data: userProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = userProfile?.role === "admin";
  const isGuideOfTour = guides.some((g) => g.user_id === user.id);
  const canEdit = isAdmin || isGuideOfTour;

  const participants =
    canEdit && report.tours
      ? await getTourParticipantsForListing(supabase, report.tours.id, user.id)
      : [];

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Top Navigation - Simple like Tour detail page */}
      <div className="mb-6 flex items-center justify-between text-sm">
        <Link
          href="/berichte"
          className="text-slate-500 hover:text-jdav-green flex items-center gap-1 font-medium transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Zurück
        </Link>
        {canEdit && (
          <div className="flex gap-2">
            {participants.length > 0 && (
              <ParticipantPopup participants={participants} />
            )}
            <Link
              href={`/touren/${report.tours?.id}/bericht/edit?id=${report.id}`}
            >
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg h-9 border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Bearbeiten
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200">
        {/* Banner Section */}
        {bannerImage ? (
          <div className="relative aspect-[21/9] w-full overflow-hidden bg-slate-900">
            <Image
              src={bannerImage.image_url}
              alt={report.title}
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        ) : (
          <div className="flex aspect-[21/9] w-full items-center justify-center bg-jdav-green text-white">
            <Mountain className="h-16 w-16 opacity-20" />
          </div>
        )}

        {/* Content */}
        <div className="p-8 sm:p-12">
          {/* Title & Meta */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="rounded-full bg-jdav-green/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-jdav-green">
                {report.tours?.tour_categorys?.category || "Tour"}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {report.tours?.start_date
                  ? format(new Date(report.tours.start_date), "dd.MM.yyyy")
                  : "–"}
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-5xl mb-4">
              {report.title}
            </h1>
            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
              <User className="h-4 w-4 text-slate-300" />
              <span>
                Ein Bericht von{" "}
                <span className="text-slate-900 font-bold">
                  {report.profiles?.full_name || "Unbekannt"}
                </span>
              </span>
            </div>
          </div>

          {/* Info Grid - Standardized to Tour detail page style */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-10">
            <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 text-center border border-slate-100/50">
              <MapPin className="mb-2 h-5 w-5 text-jdav-green" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Zielgebiet
              </span>
              <span className="mt-1 font-bold text-sm text-slate-700">
                {report.tours?.target_area || "n.A."}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 text-center border border-slate-100/50">
              <Mountain className="mb-2 h-5 w-5 text-jdav-green" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Höhenmeter
              </span>
              <span className="mt-1 font-bold text-sm text-slate-700">
                {report.tours?.elevation || 0}m
              </span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 text-center border border-slate-100/50">
              <Ruler className="mb-2 h-5 w-5 text-jdav-green" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Strecke
              </span>
              <span className="mt-1 font-bold text-sm text-slate-700">
                {report.tours?.distance || 0}km
              </span>
            </div>
          </div>

          {/* Report Content */}
          <div className="prose prose-slate prose-jdav max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap mb-12">
            <ReactMarkdown>{report.report_text}</ReactMarkdown>
          </div>

          {/* Related Tour Link */}
          {report.tours?.id && (
            <div className="mb-12 rounded-2xl border border-slate-100 bg-slate-50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Passende Tour
                </h4>
                <p className="font-bold text-slate-900">{report.tours.title}</p>
              </div>
              <Link
                href={`/touren/${report.tours.id}`}
                className="shrink-0 w-full sm:w-auto"
              >
                <Button
                  variant="outline"
                  className="w-full sm:w-auto rounded-xl border-slate-200 text-xs font-bold hover:bg-slate-900 hover:text-white transition-all"
                >
                  Tour ansehen <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          )}

          {/* Gallery */}
          <div className="pt-10 border-t border-slate-100">
            <ReportGallery images={galleryImages} />
          </div>
        </div>
      </div>
    </div>
  );
}
