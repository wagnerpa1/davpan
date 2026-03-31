"use client";

import {
  AlertTriangle,
  Check,
  ChevronRight,
  Info,
  Package,
  Phone,
  Printer,
  UserMinus,
  X,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { updateParticipantStatus } from "@/app/actions/participant-management";
import { bulkUpdateTourReservations } from "@/app/actions/admin-reservation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { calculateAge } from "@/utils/date";

interface Participant {
  id: string;
  status: string;
  user_id: string;
  child_profile_id: string | null;
  age_override?: boolean;
  created_at?: string | null;
  profiles?: {
    full_name?: string | null;
    phone?: string | null;
    emergency_phone?: string | null;
    medical_notes?: string | null;
    birthdate?: string | null;
  } | null;
  child_profiles?: {
    full_name?: string | null;
    medical_notes?: string | null;
    birthdate?: string | null;
    profiles?: {
      full_name?: string | null;
    } | null;
  } | null;
}

interface Reservation {
  id: string;
  material_id: string;
  user_id: string;
  child_profile_id: string | null;
  size?: string;
  materials: {
    name: string;
  };
}

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
  const [isBulking, setIsBulking] = useState(false);

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
      // Composite key hält parent/child-Reservierungen eindeutig und stabil.
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

  const filteredParticipants = participants.filter((p) => {
    if (filter === "all") return p.status !== "cancelled";
    return p.status === filter;
  });

  const cancelledParticipants = participants.filter(
    (p) => p.status === "cancelled",
  );

  const handleStatusUpdate = async (
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
      if (selectedParticipant?.id === regId) setSelectedParticipant(null);
    }
  };

  const getParticipantReservations = (p: Participant) => {
    const key = `${p.user_id}:${p.child_profile_id ?? "self"}`;
    return reservationsByParticipant.get(key) || [];
  };

  const getParticipantAge = (participant: Participant) =>
    calculateAge(
      participant.child_profiles?.birthdate || participant.profiles?.birthdate,
    );

  const hasAgeExceptionRequest = (participant: Participant) => {
    if (participant.age_override) {
      return true;
    }

    if (minAge == null) {
      return false;
    }

    const age = getParticipantAge(participant);
    return age != null && age < minAge;
  };

  return (
    <div className="space-y-6">
      {/* Print-only Header */}
      <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              Teilnehmerliste – JDAV Pfarrkirchen
            </h1>
            <div className="grid grid-cols-2 gap-x-12 gap-y-1 text-sm text-slate-800">
              <p>
                <span className="font-bold text-slate-500 uppercase text-[10px] block">
                  Tour
                </span>{" "}
                {tourTitle}
              </p>
              <p>
                <span className="font-bold text-slate-500 uppercase text-[10px] block">
                  Datum
                </span>{" "}
                {tourDate}
              </p>
              <p>
                <span className="font-bold text-slate-500 uppercase text-[10px] block">
                  Leitung
                </span>{" "}
                {guides.join(", ")}
              </p>
              <p>
                <span className="font-bold text-slate-500 uppercase text-[10px] block">
                  Treffpunkt
                </span>{" "}
                {meetingTime} Uhr, {meetingPoint}
              </p>
              <p>
                <span className="font-bold text-slate-500 uppercase text-[10px] block">
                  Status
                </span>{" "}
                {counts.confirmed} / {maxParticipants || "∞"} Teilnehmer
              </p>
              <p>
                <span className="font-bold text-slate-500 uppercase text-[10px] block">
                  Tour-ID
                </span>{" "}
                {tourId}
              </p>
            </div>
          </div>
          <Image
            src="/JDAV-Logo-grün-ganz.svg"
            alt="JDAV Logo"
            width={240}
            height={64}
            className="h-auto w-60"
          />
        </div>
      </div>

      {/* Screen-only Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
              filter === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            Alle ({counts.active})
          </button>
          <button
            type="button"
            onClick={() => setFilter("confirmed")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
              filter === "confirmed"
                ? "bg-white text-jdav-green shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            Bestätigt ({counts.confirmed})
          </button>
          <button
            type="button"
            onClick={() => setFilter("waitlist")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
              filter === "waitlist"
                ? "bg-white text-amber-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            Warteliste ({counts.waitlist})
          </button>
        </div>

                <div className="flex gap-2 print:hidden items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (confirm("Moechten Sie alle reservierten Materialien auf 'Ausgegeben' setzen?")) {
                setIsBulking(true);
                await bulkUpdateTourReservations(tourId, "reserved", "on loan");
                setIsBulking(false);
              }
            }}
            disabled={isBulking}
            className="bg-white border-jdav-green text-jdav-green hover:bg-green-50 rounded-xl"
          >
            <Package className="h-4 w-4 mr-2" /> Alle Ausgeben
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl"
          >
            <Printer className="h-4 w-4 mr-2" /> Liste drucken
          </Button>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden print:border-slate-800 print:rounded-none">
        <table className="w-full text-left text-sm print:text-[11px] print:leading-tight">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-widest text-[10px] border-b border-slate-200 print:bg-white print:border-slate-800">
            <tr>
              <th className="px-4 py-3 w-8">Nr</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3 w-12">Alter</th>
              <th className="px-4 py-3">Telefon</th>
              <th className="px-4 py-3">Notfallkontakt</th>
              <th className="px-4 py-3">Material</th>
              <th className="px-4 py-3 print:hidden">Status</th>
              <th className="px-4 py-3 text-right print:hidden">Aktion</th>
              <th className="hidden print:table-cell px-4 py-3 w-12 text-center border-l border-slate-800">
                Check
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 print:divide-slate-800">
            {filteredParticipants.map((p, index) => {
              const resList = getParticipantReservations(p);
              const age = getParticipantAge(p);
              const isAgeExceptionRequested = hasAgeExceptionRequest(p);
              const name =
                p.child_profiles?.full_name ||
                p.profiles?.full_name ||
                "Unbekannt";
              const parentName = p.child_profiles?.profiles?.full_name;
              const medicalNotes =
                p.child_profiles?.medical_notes || p.profiles?.medical_notes;

              return (
                <tr
                  key={p.id}
                  className="hover:bg-slate-50/50 transition-colors group cursor-pointer lg:cursor-default"
                  onClick={() => setSelectedParticipant(p)}
                >
                  <td className="px-4 py-3 font-medium text-slate-400">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900 flex flex-wrap items-center gap-1.5">
                      {name}
                      {isAgeExceptionRequested && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-800">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Alters-Ausnahme beantragt
                        </span>
                      )}
                      {p.child_profiles && (
                        <span className="bg-blue-50 text-blue-600 px-1.5 py-0.2 rounded text-[8px] uppercase font-black">
                          Kind
                        </span>
                      )}
                    </div>
                    {parentName && (
                      <div className="text-[10px] text-slate-400 font-medium">
                        Eltern: {parentName}
                      </div>
                    )}
                    {medicalNotes && (
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-red-500 bg-red-50 w-fit px-1.5 py-0.5 rounded-md print:bg-transparent print:p-0">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        <span className="print:hidden">Hinweis prüfen</span>
                        <span className="hidden print:inline">
                          {medicalNotes}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{age || "–"}</td>
                  <td className="px-4 py-3 font-medium text-slate-600">
                    {p.profiles?.phone || "–"}
                  </td>
                  <td className="px-4 py-3 font-black text-red-600">
                    {p.profiles?.emergency_phone || "–"}
                  </td>
                  <td className="px-4 py-3">
                    {resList.length > 0 ? (
                      <div className="text-[10px] font-medium leading-tight">
                        {resList.map((r) => (
                          <div key={r.id}>
                            • {r.materials?.name} {r.size && `(${r.size})`}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-300 italic text-xs">–</span>
                    )}
                  </td>
                  <td className="px-4 py-3 print:hidden">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter shadow-sm",
                        p.status === "confirmed"
                          ? "bg-jdav-green text-white"
                          : p.status === "waitlist"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {p.status === "confirmed"
                        ? "Bestätigt"
                        : p.status === "waitlist"
                          ? "Warteliste"
                          : "Offen"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right print:hidden">
                    <div className="flex justify-end gap-1.5">
                      {/* Info Button for Desktop users to see details */}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedParticipant(p);
                        }}
                        className="hidden lg:flex bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-900 p-2 rounded-lg transition-all"
                      >
                        <Info className="h-4 w-4" />
                      </button>

                      {p.status !== "confirmed" && (
                        <button
                          type="button"
                          disabled={!!isUpdating}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleStatusUpdate(p.id, "confirmed");
                          }}
                          className="bg-jdav-green/10 hover:bg-jdav-green text-jdav-green hover:text-white p-2 rounded-lg transition-all"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={!!isUpdating}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleStatusUpdate(p.id, "cancelled");
                        }}
                        className="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white p-2 rounded-lg transition-all"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="hidden print:table-cell px-4 py-3 border-l border-slate-800">
                    <div className="h-5 w-5 border-2 border-slate-300 mx-auto rounded-md"></div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Participant Detail Modal */}
      {selectedParticipant && (
        <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm transition-all animate-in fade-in">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  {selectedParticipant.child_profiles?.full_name ||
                    selectedParticipant.profiles?.full_name}
                </h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                  {selectedParticipant.child_profiles
                    ? "Kind-Profil"
                    : "Mitglied-Profil"}
                  {hasAgeExceptionRequest(selectedParticipant) &&
                    " • ALTERS-AUSNAHME"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedParticipant(null)}
                className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto print:hidden">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Status / Alter
                  </p>
                  <p className="font-bold text-slate-900">
                    {selectedParticipant.status === "confirmed"
                      ? "Bestätigt"
                      : selectedParticipant.status === "waitlist"
                        ? "Warteliste"
                        : "Offen"}{" "}
                    •{" "}
                    {calculateAge(
                      selectedParticipant.child_profiles?.birthdate ||
                        selectedParticipant.profiles?.birthdate,
                    ) || "n.A."}{" "}
                    Jahre
                  </p>
                  {hasAgeExceptionRequest(selectedParticipant) && (
                    <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-amber-700">
                      Alters-Ausnahme beantragt
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-black uppercase tracking-tighter shadow-sm",
                    selectedParticipant.status === "confirmed"
                      ? "bg-jdav-green text-white"
                      : "bg-slate-200 text-slate-600",
                  )}
                >
                  {selectedParticipant.status === "confirmed"
                    ? "Bestätigt"
                    : selectedParticipant.status === "waitlist"
                      ? "Warteliste"
                      : "Offen"}
                </span>
              </div>

              {selectedParticipant.child_profiles?.profiles?.full_name && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Elternteil
                  </p>
                  <p className="font-bold text-slate-900">
                    {selectedParticipant.child_profiles.profiles.full_name}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Phone className="h-4 w-4 text-jdav-green" /> Kontakt /
                  Notfall
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-slate-50/50 p-3 rounded-xl border border-dashed border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Telefon
                    </p>
                    <p className="font-bold text-slate-700">
                      {selectedParticipant.profiles?.phone || "Nicht angegeben"}
                    </p>
                  </div>
                  <div className="bg-red-50/50 p-3 rounded-xl border border-dashed border-red-100">
                    <p className="text-[10px] font-bold text-red-400 uppercase">
                      Notfallkontakt
                    </p>
                    <p className="font-bold text-red-600">
                      🚨{" "}
                      {selectedParticipant.profiles?.emergency_phone ||
                        "Nicht angegeben"}
                    </p>
                  </div>
                </div>
              </div>

              {(selectedParticipant.child_profiles?.medical_notes ||
                selectedParticipant.profiles?.medical_notes) && (
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Info className="h-4 w-4 text-amber-500" /> Wichtige
                    Hinweise
                  </h4>
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-sm text-amber-900 leading-relaxed font-medium">
                    {selectedParticipant.child_profiles?.medical_notes ||
                      selectedParticipant.profiles?.medical_notes}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Package className="h-4 w-4 text-jdav-green" /> Reserviertes
                  Material
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {getParticipantReservations(selectedParticipant).length >
                  0 ? (
                    getParticipantReservations(selectedParticipant).map(
                      (res) => (
                        <div
                          key={res.id}
                          className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100"
                        >
                          <span className="font-bold text-slate-900">
                            {res.materials?.name}
                          </span>
                          {res.size && (
                            <span className="bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500">
                              {res.size}
                            </span>
                          )}
                        </div>
                      ),
                    )
                  ) : (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200 text-center">
                      Kein Material angefordert
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 print:hidden">
              {selectedParticipant.status !== "confirmed" && (
                <Button
                  onClick={() =>
                    handleStatusUpdate(selectedParticipant.id, "confirmed")
                  }
                  disabled={!!isUpdating}
                  className="flex-1 bg-jdav-green hover:bg-jdav-green-dark text-white font-bold h-12 rounded-xl shadow-lg shadow-jdav-green/20"
                >
                  {isUpdating === selectedParticipant.id
                    ? "..."
                    : "Zusage senden"}
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() =>
                  handleStatusUpdate(selectedParticipant.id, "cancelled")
                }
                className="flex-1 bg-white border border-red-100 text-red-500 hover:bg-red-50 font-bold h-12 rounded-xl"
              >
                Ablehnen
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancelled section */}
      {cancelledParticipants.length > 0 && (
        <details className="group rounded-2xl border border-slate-200 bg-slate-50/30 print:hidden overflow-hidden transition-all">
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
