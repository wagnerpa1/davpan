import { AlertTriangle, Check, Info, UserMinus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Participant, Reservation } from "./ParticipantDetailModal";

interface ParticipantTableProps {
  participants: Participant[];
  getParticipantReservations: (p: Participant) => Reservation[];
  getParticipantAge: (p: Participant) => number | null;
  hasAgeExceptionRequest: (p: Participant) => boolean;
  isUpdating: string | null;
  onSelectParticipant: (p: Participant) => void;
  onStatusUpdate: (
    regId: string,
    status: "confirmed" | "cancelled" | "pending" | "waitlist",
  ) => void;
}

export function ParticipantTable({
  participants,
  getParticipantReservations,
  getParticipantAge,
  hasAgeExceptionRequest,
  isUpdating,
  onSelectParticipant,
  onStatusUpdate,
}: ParticipantTableProps) {
  return (
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
          {participants.map((p, index) => {
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
                onClick={() => onSelectParticipant(p)}
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
                    <button
                      type="button"
                      aria-label={`Teilnehmerdetails für ${name} anzeigen`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectParticipant(p);
                      }}
                      className="hidden lg:flex bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-900 p-2 rounded-lg transition-colors"
                    >
                      <Info className="h-4 w-4" />
                    </button>

                    {p.status !== "confirmed" && (
                      <button
                        type="button"
                        aria-label={`Teilnehmer ${name} bestätigen`}
                        disabled={!!isUpdating}
                        onClick={(event) => {
                          event.stopPropagation();
                          onStatusUpdate(p.id, "confirmed");
                        }}
                        className="bg-jdav-green/10 hover:bg-jdav-green text-jdav-green hover:text-white p-2 rounded-lg transition-colors"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`Teilnehmer ${name} absagen`}
                      disabled={!!isUpdating}
                      onClick={(event) => {
                        event.stopPropagation();
                        onStatusUpdate(p.id, "cancelled");
                      }}
                      className="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white p-2 rounded-lg transition-colors"
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
  );
}
