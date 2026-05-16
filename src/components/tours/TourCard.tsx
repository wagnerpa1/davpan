"use client";

import { format } from "date-fns";
import { Calendar, ChevronRight, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface TourGuide {
  user_id: string;
  profiles?: {
    full_name?: string | null;
  } | null;
}

interface TourParticipant {
  status: string;
}

interface TourCardData {
  id: string;
  title: string;
  tour_groups?: { group_name: string | null } | null;
  category?: string | null;
  tour_categorys?: { category: string | null } | null;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  target_area?: string | null;
  max_participants?: number | null;
  confirmed_participants_count?: number | null;
  difficulty?: string | null;
  tour_participants?: TourParticipant[];
  tour_guides?: TourGuide[];
}

interface TourCardProps {
  tour: TourCardData;
}

function getTourDateLabel(startDate?: string | null, endDate?: string | null) {
  if (!startDate) {
    return "TBA";
  }

  if (endDate && startDate !== endDate) {
    return `${format(new Date(startDate), "dd.MM.")} - ${format(new Date(endDate), "dd.MM.yy")}`;
  }

  return format(new Date(startDate), "dd.MM.yyyy");
}

function getTourStatusLabel(status: string) {
  switch (status) {
    case "open":
      return "Anmeldung offen";
    case "full":
      return "Ausgebucht";
    case "cancelled":
      return "Abgesagt";
    case "completed":
      return "Abgeschlossen";
    case "planning":
      return "In Planung";
    default:
      return status;
  }
}

function getTourStatusClass(status: string, isCancelled: boolean) {
  if (isCancelled) {
    return "bg-red-100 text-red-700 ring-red-600/20";
  }

  switch (status) {
    case "open":
      return "bg-green-100 text-green-800 ring-green-700/20";
    case "full":
      return "bg-amber-50 text-amber-800 ring-amber-600/20";
    case "completed":
      return "bg-slate-50 text-slate-600 ring-slate-600/20";
    default:
      return "bg-blue-50 text-blue-700 ring-blue-700/10";
  }
}

function getTourCapacityBarClass(
  isCancelled: boolean,
  isFull: boolean,
  isLow: boolean,
) {
  if (isCancelled) return "bg-slate-300";
  if (isFull) return "bg-red-500";
  if (isLow) return "bg-orange-400";

  return "bg-jdav-green";
}

export function TourCard({ tour }: TourCardProps) {
  const isCancelled = tour.status === "cancelled";
  const confirmedCount =
    tour.confirmed_participants_count ??
    tour.tour_participants?.filter((p) => p.status === "confirmed").length ??
    0;
  const maxParticipants = tour.max_participants || 0;
  const isFull = maxParticipants > 0 && confirmedCount >= maxParticipants;
  const isLow =
    maxParticipants > 0 && maxParticipants - confirmedCount <= 2 && !isFull;
  const barColor = getTourCapacityBarClass(isCancelled, isFull, isLow);
  const statusClass = getTourStatusClass(tour.status, isCancelled);
  const statusLabel = getTourStatusLabel(tour.status);
  const dateLabel = getTourDateLabel(tour.start_date, tour.end_date);
  const guideNames =
    tour.tour_guides?.map((guide) => guide.profiles?.full_name) ?? [];

  return (
    <Link href={`/touren/${tour.id}`} className="motion-press block">
      <div
        className={cn(
          "motion-card motion-enter group relative overflow-hidden rounded-2xl border shadow-sm transition-all",
          isCancelled
            ? "border-slate-200 bg-slate-50 text-slate-500"
            : "border-slate-200 bg-white hover:border-jdav-green hover:shadow-md",
        )}
      >
        {/* Capacity Bar */}
        <div className={cn("h-1.5 w-full", barColor)} />

        <div className="p-5">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                {tour.tour_groups?.group_name && (
                  <span
                    className={cn(
                      "inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-tight",
                      isCancelled
                        ? "bg-slate-200 text-slate-600"
                        : "bg-slate-100 text-slate-700",
                    )}
                  >
                    {tour.tour_groups.group_name}
                  </span>
                )}
                <span
                  className={cn(
                    "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                    isCancelled
                      ? "bg-slate-200 text-slate-600"
                      : "bg-slate-100 text-slate-700",
                  )}
                >
                  {tour.tour_categorys?.category || "Tour"}
                </span>
                {isFull && (
                  <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-600 uppercase">
                    Warteliste aktiv
                  </span>
                )}
              </div>
              <h2
                className={cn(
                  "text-xl font-bold",
                  isCancelled
                    ? "text-slate-500 line-through"
                    : "text-slate-900 group-hover:text-jdav-green",
                )}
              >
                {tour.title}
              </h2>
            </div>
            <ChevronRight
              className={cn(
                "h-5 w-5 text-slate-400 opacity-0 transition-opacity",
                !isCancelled && "group-hover:opacity-100",
              )}
            />
          </div>

          <div
            className={cn(
              "mt-4 grid grid-cols-1 gap-3 text-sm xs:grid-cols-2 sm:grid-cols-3",
              isCancelled ? "text-slate-500" : "text-slate-600",
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Calendar
                className={cn(
                  "h-4 w-4 shrink-0",
                  isCancelled ? "text-slate-400" : "text-jdav-green",
                )}
              />
              <span className="truncate">{dateLabel}</span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <MapPin
                className={cn(
                  "h-4 w-4 shrink-0",
                  isCancelled ? "text-slate-400" : "text-jdav-green",
                )}
              />
              <span className="truncate">
                <span className="mr-1 text-slate-600">Ziel:</span>
                {tour.target_area || "n/a"}
              </span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Users
                className={cn(
                  "h-4 w-4 shrink-0",
                  isCancelled ? "text-slate-400" : "text-jdav-green",
                )}
              />
              <span
                className={cn("truncate", isFull && "text-red-600 font-bold")}
              >
                {confirmedCount} / {tour.max_participants || "∞"}
              </span>
            </div>
          </div>

          {tour.tour_guides && tour.tour_guides.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
              <span
                className={cn(
                  "font-medium",
                  isCancelled ? "text-slate-500" : "text-slate-600",
                )}
              >
                Leitung:
              </span>
              {guideNames.map((guideName, index) => (
                <span key={`${tour.id}-guide-${index}`}>{guideName}</span>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <div
              className={cn(
                "inline-flex rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                statusClass,
              )}
            >
              {statusLabel}
            </div>
            {tour.difficulty && (
              <div className="inline-flex rounded-md bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700 ring-1 ring-inset ring-stone-200">
                {tour.difficulty}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
