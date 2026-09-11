"use client";

import { ChevronRight, Printer } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { updateParticipantStatus } from "@/app/actions/participant-management";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import { calculateAge } from "@/utils/date";
import type { Participant, Reservation } from "./ParticipantDetailModal";
import { ParticipantDetailModal } from "./ParticipantDetailModal";
import { ParticipantTable } from "./ParticipantTable";
import { PrintableParticipantHeader } from "./PrintableParticipantHeader";

interface ParticipantManagementProps {
  tourId: string;
  tourTitle: string;
  tourDate: string;
  meetingPoint: string;
  meetingTime: string;
  maxParticipants: number;
  minAge: number | null;
  guides: string[];
  participants: Participant[];
  reservations: Reservation[];
}

function getParticipantKey(userId: string, childProfileId: string | null) {
  return `${userId}:${childProfileId ?? "self"}`;
}

export function ParticipantManagement({
  tourId,
  tourTitle,
  tourDate,
  meetingPoint,
  meetingTime,
  maxParticipants,
  minAge,
  guides,
  participants,
  reservations,
}: ParticipantManagementProps) {
  const [selectedParticipant, setSelectedParticipant] =
    useState<Participant | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const counts = useMemo(() => {
    let active = 0;
    let confirmed = 0;
    let waitlist = 0;
    let cancelled = 0;

    for (const participant of participants) {
      if (participant.status === "cancelled") {
        cancelled++;
      } else {
        active++;
      }

      if (participant.status === "confirmed") confirmed++;
      if (participant.status === "waitlist") waitlist++;
    }

    return { active, confirmed, waitlist, cancelled };
  }, [participants]);

  const reservationsByParticipant = useMemo(() => {
    const grouped = new Map<string, Reservation[]>();

    for (const reservation of reservations) {
      const key = `${reservation.user_id}:${reservation.child_profile_id ?? "self"}`;
      const bucket = grouped.get(key);
      if (bucket) {
        bucket.push(reservation);
      } else {
        grouped.set(key, [reservation]);
      }
    }

    return grouped;
  }, [reservations]);

  const { filteredParticipants, cancelledParticipants } = useMemo(() => {
    const nextFilteredParticipants: Participant[] = [];
    const nextCancelledParticipants: Participant[] = [];

    for (const participant of participants) {
      if (participant.status === "cancelled") {
        nextCancelledParticipants.push(participant);
        continue;
      }

      if (filter === "all" || participant.status === filter) {
        nextFilteredParticipants.push(participant);
      }
    }

    return {
      filteredParticipants: nextFilteredParticipants,
      cancelledParticipants: nextCancelledParticipants,
    };
  }, [participants, filter]);

  const handleStatusUpdate = useCallback(
    async (
      regId: string,
      status: "confirmed" | "cancelled" | "pending" | "waitlist",
    ) => {
      setIsUpdating(regId);
      try {
        await updateParticipantStatus(regId, status);
      } catch (err) {
        alert(`Fehler beim Aktualisieren: ${(err as Error).message}`);
      } finally {
        setIsUpdating(null);
        setSelectedParticipant((current) =>
          current?.id === regId ? null : current,
        );
      }
    },
    [],
  );

  const getParticipantReservations = useCallback(
    (p: Participant) => {
      return (
        reservationsByParticipant.get(
          getParticipantKey(p.user_id, p.child_profile_id),
        ) || []
      );
    },
    [reservationsByParticipant],
  );

  const getParticipantAge = useCallback(
    (participant: Participant) =>
      calculateAge(
        participant.child_profiles?.birthdate ||
          participant.profiles?.birthdate,
      ),
    [],
  );

  const hasAgeExceptionRequest = useCallback(
    (participant: Participant) => {
      if (participant.age_override) {
        return true;
      }

      if (minAge == null) {
        return false;
      }

      const age = getParticipantAge(participant);
      return age != null && age < minAge;
    },
    [getParticipantAge, minAge],
  );

  return (
    <div className="space-y-6">
      <PrintableParticipantHeader
        appName={siteConfig.appName}
        tourTitle={tourTitle}
        tourDate={tourDate}
        guides={guides}
        meetingTime={meetingTime}
        meetingPoint={meetingPoint}
        confirmedCount={counts.confirmed}
        maxParticipants={maxParticipants}
        tourId={tourId}
        logoPath={siteConfig.logoPath}
        logoAlt={siteConfig.logoAlt}
      />

      {/* Screen-only Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button
            type="button"
            aria-label="Alle Teilnehmer anzeigen"
            onClick={() => setFilter("all")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-colors",
              filter === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            Alle ({counts.active})
          </button>
          <button
            type="button"
            aria-label="Bestätigte Teilnehmer anzeigen"
            onClick={() => setFilter("confirmed")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-colors",
              filter === "confirmed"
                ? "bg-white text-jdav-green shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            Bestätigt ({counts.confirmed})
          </button>
          <button
            type="button"
            aria-label="Wartelisten anzeigen"
            onClick={() => setFilter("waitlist")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-colors",
              filter === "waitlist"
                ? "bg-white text-amber-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            Warteliste ({counts.waitlist})
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl"
        >
          <Printer className="h-4 w-4 mr-2" /> Liste drucken
        </Button>
      </div>

      <ParticipantTable
        participants={filteredParticipants}
        getParticipantReservations={getParticipantReservations}
        getParticipantAge={getParticipantAge}
        hasAgeExceptionRequest={hasAgeExceptionRequest}
        isUpdating={isUpdating}
        onSelectParticipant={setSelectedParticipant}
        onStatusUpdate={handleStatusUpdate}
      />

      {selectedParticipant && (
        <ParticipantDetailModal
          participant={selectedParticipant}
          minAge={minAge}
          getParticipantReservations={getParticipantReservations}
          isUpdating={isUpdating}
          onClose={() => setSelectedParticipant(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}

      {/* Cancelled section */}
      {cancelledParticipants.length > 0 && (
        <details className="group rounded-2xl border border-slate-200 bg-slate-50/30 print:hidden overflow-hidden transition-colors">
          <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-bold text-slate-500 hover:text-slate-800 transition-colors">
            <span>Abgemeldete Teilnehmer ({cancelledParticipants.length})</span>
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
          </summary>
          <div className="px-4 pb-4">
            <div className="space-y-2">
              {cancelledParticipants.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center py-2 px-3 bg-white/50 rounded-xl border border-slate-100 text-xs shadow-sm"
                >
                  <span className="font-medium text-slate-600">
                    {p.child_profiles?.full_name || p.profiles?.full_name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(p.id, "pending")}
                    className="text-jdav-green font-bold uppercase text-[10px] hover:underline"
                  >
                    Wiederherstellen
                  </button>
                </div>
              ))}
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
