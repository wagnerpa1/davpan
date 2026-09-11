import { format } from "date-fns";
import {
  Baby,
  Calendar,
  Clock,
  Euro,
  Mountain,
  Ruler,
  Tag,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TourInfoGridProps {
  startDate?: string | null;
  endDate?: string | null;
  categoryLabel?: string | null;
  difficulty?: string | null;
  isFull: boolean;
  confirmedParticipantCount: number;
  maxParticipants?: number | null;
  distance?: number | null;
  durationHours?: number | null;
  costInfo?: string | null;
  minAge?: number | null;
}

function formatTourDate(startDate?: string | null, endDate?: string | null) {
  if (!startDate) {
    return "TBA";
  }

  if (endDate && startDate !== endDate) {
    return `${format(new Date(startDate), "dd.MM.")} – ${format(new Date(endDate), "dd.MM.yy")}`;
  }

  return format(new Date(startDate), "dd.MM.yy");
}

export function TourInfoGrid({
  startDate,
  endDate,
  categoryLabel,
  difficulty,
  isFull,
  confirmedParticipantCount,
  maxParticipants,
  distance,
  durationHours,
  costInfo,
  minAge,
}: TourInfoGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 mb-8 print:hidden">
      <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 text-center">
        <Calendar className="mb-2 h-6 w-6 text-jdav-green" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Datum
        </span>
        <span className="mt-1 font-medium text-sm">
          {formatTourDate(startDate, endDate)}
        </span>
      </div>
      <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 text-center">
        <Tag className="mb-2 h-6 w-6 text-jdav-green" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Kategorie
        </span>
        <span className="mt-1 font-medium text-sm capitalize">
          {categoryLabel || "n.A."}
        </span>
      </div>
      <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 text-center">
        <Mountain className="mb-2 h-6 w-6 text-jdav-green" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Schwierigkeit
        </span>
        <span className="mt-1 font-medium text-sm">
          {difficulty || "Keine"}
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
          {confirmedParticipantCount} / {maxParticipants || "∞"}
        </span>
      </div>
      <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 text-center">
        <Ruler className="mb-2 h-6 w-6 text-jdav-green" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Strecke
        </span>
        <span className="mt-1 font-medium text-sm">
          {distance ? `${distance} km` : "–"}
        </span>
      </div>
      <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 text-center">
        <Clock className="mb-2 h-6 w-6 text-jdav-green" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Gehzeit
        </span>
        <span className="mt-1 font-medium text-sm">
          {durationHours ? `${durationHours} h` : "–"}
        </span>
      </div>
      {costInfo && (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 text-center">
          <Euro className="mb-2 h-6 w-6 text-jdav-green" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Kosten
          </span>
          <span className="mt-1 font-medium text-sm line-clamp-2">
            {costInfo}
          </span>
        </div>
      )}
      {minAge && (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 text-center">
          <Baby className="mb-2 h-6 w-6 text-jdav-green" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Mindestalter
          </span>
          <span className="mt-1 font-medium text-sm">{minAge} Jahre</span>
        </div>
      )}
    </div>
  );
}
