import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar, MapPin, Mountain } from "lucide-react";

interface ReportTourMetaCardProps {
  tour: {
    title: string;
    start_date?: string | null;
    target_area?: string | null;
  };
}

export function ReportTourMetaCard({ tour }: ReportTourMetaCardProps) {
  return (
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
  );
}
