import { MapPin, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

interface TourDetailsContentProps {
  categoryLabel?: string | null;
  description?: string | null;
  meetingPoint?: string | null;
  meetingTime?: string | null;
  requirements?: string | null;
}

export function TourDetailsContent({
  categoryLabel,
  description,
  meetingPoint,
  meetingTime,
  requirements,
}: TourDetailsContentProps) {
  return (
    <div className="space-y-8">
      {/* Description */}
      <section className="print:hidden">
        <h3 className="mb-2 text-lg font-bold text-slate-900 group-hover:text-jdav-green leading-snug">
          Beschreibung
        </h3>
        <div className="mb-2 text-[10px] text-slate-400 font-medium">
          {categoryLabel || "Tour"}
        </div>
        <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap">
          {description || "Keine Beschreibung vorhanden."}
        </div>
      </section>

      {/* Meeting Point + Requirements */}
      <section className="grid gap-6 sm:grid-cols-2 print:hidden">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
          <h4 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
            <MapPin className="h-5 w-5 text-jdav-green" /> Treffpunkt
          </h4>
          <p className="text-sm text-slate-600 leading-relaxed">
            {meetingPoint || siteConfig.defaultMeetingPoint} <br />
            <span className="font-bold text-jdav-green">
              {meetingTime
                ? `Um ${meetingTime.substring(0, 5)} Uhr`
                : "Zeit noch unklar"}
            </span>
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
          <h4 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
            <ShieldCheck className="h-5 w-5 text-jdav-green" /> Voraussetzungen
          </h4>
          <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
            {requirements || "Keine besonderen Voraussetzungen."}
          </div>
        </div>
      </section>
    </div>
  );
}
