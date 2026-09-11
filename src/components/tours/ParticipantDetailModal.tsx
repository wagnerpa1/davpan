import { Info, Package, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { calculateAge } from "@/utils/date";

export interface ParticipantProfile {
  full_name?: string | null;
  phone?: string | null;
  emergency_phone?: string | null;
  medical_notes?: string | null;
  birthdate?: string | null;
}

export interface ChildProfile {
  full_name?: string | null;
  medical_notes?: string | null;
  birthdate?: string | null;
  profiles?: {
    full_name?: string | null;
  } | null;
}

export interface Participant {
  id: string;
  status: string;
  user_id: string;
  child_profile_id: string | null;
  age_override?: boolean | number | null;
  created_at?: string | null;
  profiles?: ParticipantProfile | null;
  child_profiles?: ChildProfile | null;
}

export interface Reservation {
  id: string;
  material_id: string;
  user_id: string;
  child_profile_id: string | null;
  size?: string;
  materials: {
    name: string;
  };
}

interface ParticipantDetailModalProps {
  participant: Participant;
  minAge: number | null;
  getParticipantReservations: (p: Participant) => Reservation[];
  isUpdating: string | null;
  onClose: () => void;
  onStatusUpdate: (
    regId: string,
    status: "confirmed" | "cancelled" | "pending" | "waitlist",
  ) => void;
}

function getParticipantName(participant: Participant) {
  return (
    participant.child_profiles?.full_name || participant.profiles?.full_name
  );
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    confirmed: "Bestätigt",
    waitlist: "Warteliste",
  };

  return labels[status] ?? "Offen";
}

function ParticipantHeader({
  participant,
  hasAgeException,
  onClose,
}: {
  participant: Participant;
  hasAgeException: boolean;
  onClose: () => void;
}) {
  return (
    <div className="p-6 border-b border-slate-100 flex justify-between items-start">
      <div>
        <h3 className="text-xl font-black text-slate-900 tracking-tight">
          {getParticipantName(participant)}
        </h3>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
          {participant.child_profiles ? "Kind-Profil" : "Mitglied-Profil"}
          {hasAgeException && " • ALTERS-AUSNAHME"}
        </p>
      </div>
      <button
        type="button"
        aria-label="Teilnehmerdetails schließen"
        onClick={onClose}
        className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-900"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

function ParticipantStatusSummary({
  participant,
  age,
  hasAgeException,
}: {
  participant: Participant;
  age: number | null;
  hasAgeException: boolean;
}) {
  const statusLabel = getStatusLabel(participant.status);

  return (
    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Status / Alter
        </p>
        <p className="font-bold text-slate-900">
          {statusLabel} • {age || "n.A."} Jahre
        </p>
        {hasAgeException && (
          <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-amber-700">
            Alters-Ausnahme beantragt
          </p>
        )}
      </div>
      <span
        className={cn(
          "px-3 py-1 rounded-full text-xs font-black uppercase tracking-tighter shadow-sm",
          participant.status === "confirmed"
            ? "bg-jdav-green text-white"
            : "bg-slate-200 text-slate-600",
        )}
      >
        {statusLabel}
      </span>
    </div>
  );
}

function ParentInfo({ participant }: { participant: Participant }) {
  const parentName = participant.child_profiles?.profiles?.full_name;

  if (!parentName) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        Elternteil
      </p>
      <p className="font-bold text-slate-900">{parentName}</p>
    </div>
  );
}

function ContactInfo({ participant }: { participant: Participant }) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
        <Phone className="h-4 w-4 text-jdav-green" /> Kontakt / Notfall
      </h4>
      <div className="grid grid-cols-1 gap-3">
        <div className="bg-slate-50/50 p-3 rounded-xl border border-dashed border-slate-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase">
            Telefon
          </p>
          <p className="font-bold text-slate-700">
            {participant.profiles?.phone || "Nicht angegeben"}
          </p>
        </div>
        <div className="bg-red-50/50 p-3 rounded-xl border border-dashed border-red-100">
          <p className="text-[10px] font-bold text-red-400 uppercase">
            Notfallkontakt
          </p>
          <p className="font-bold text-red-600">
            🚨 {participant.profiles?.emergency_phone || "Nicht angegeben"}
          </p>
        </div>
      </div>
    </div>
  );
}

function MedicalNotes({ participant }: { participant: Participant }) {
  const notes =
    participant.child_profiles?.medical_notes ||
    participant.profiles?.medical_notes;

  if (!notes) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
        <Info className="h-4 w-4 text-amber-500" /> Wichtige Hinweise
      </h4>
      <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-sm text-amber-900 leading-relaxed font-medium">
        {notes}
      </div>
    </div>
  );
}

function ReservationList({ reservations }: { reservations: Reservation[] }) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
        <Package className="h-4 w-4 text-jdav-green" /> Reserviertes Material
      </h4>
      <div className="grid grid-cols-1 gap-2">
        {reservations.length > 0 ? (
          reservations.map((res) => (
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
          ))
        ) : (
          <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200 text-center">
            Kein Material angefordert
          </p>
        )}
      </div>
    </div>
  );
}

function ParticipantActions({
  participant,
  isUpdating,
  onStatusUpdate,
}: {
  participant: Participant;
  isUpdating: string | null;
  onStatusUpdate: ParticipantDetailModalProps["onStatusUpdate"];
}) {
  return (
    <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 print:hidden">
      {participant.status !== "confirmed" && (
        <Button
          onClick={() => onStatusUpdate(participant.id, "confirmed")}
          disabled={!!isUpdating}
          className="flex-1 bg-jdav-green hover:bg-jdav-green-dark text-white font-bold h-12 rounded-xl shadow-lg shadow-jdav-green/20"
        >
          {isUpdating === participant.id ? "..." : "Zusage senden"}
        </Button>
      )}
      <Button
        variant="ghost"
        onClick={() => onStatusUpdate(participant.id, "cancelled")}
        className="flex-1 bg-white border border-red-100 text-red-500 hover:bg-red-50 font-bold h-12 rounded-xl"
      >
        Ablehnen
      </Button>
    </div>
  );
}

export function ParticipantDetailModal({
  participant,
  minAge,
  getParticipantReservations,
  isUpdating,
  onClose,
  onStatusUpdate,
}: ParticipantDetailModalProps) {
  const age = calculateAge(
    participant.child_profiles?.birthdate || participant.profiles?.birthdate,
  );
  const hasAgeException =
    !!participant.age_override ||
    (minAge != null && age != null && age < minAge);
  const reservations = getParticipantReservations(participant);

  return (
    <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom flex flex-col max-h-[90vh]">
        <ParticipantHeader
          participant={participant}
          hasAgeException={hasAgeException}
          onClose={onClose}
        />

        <div className="p-6 space-y-6 overflow-y-auto print:hidden">
          <ParticipantStatusSummary
            participant={participant}
            age={age}
            hasAgeException={hasAgeException}
          />
          <ParentInfo participant={participant} />
          <ContactInfo participant={participant} />
          <MedicalNotes participant={participant} />
          <ReservationList reservations={reservations} />
        </div>

        <ParticipantActions
          participant={participant}
          isUpdating={isUpdating}
          onStatusUpdate={onStatusUpdate}
        />
      </div>
    </div>
  );
}
