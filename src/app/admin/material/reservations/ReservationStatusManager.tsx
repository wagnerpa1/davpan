"use client";

import { Check, RotateCcw, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateReservationStatus } from "@/app/actions/admin-reservation";

export function ReservationStatusManager({
  id,
  currentStatus,
}: {
  id: string;
  currentStatus: string | null;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleStatusChange(newStatus: string) {
    if (newStatus === currentStatus) return;

    setIsPending(true);
    const result = await updateReservationStatus(id, newStatus);
    setIsPending(false);

    if (result.error) {
      alert(result.error);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {currentStatus === "requested" && (
        <>
          <button
            type="button"
            disabled={isPending}
            onClick={() => void handleStatusChange("reserved")}
            className="inline-flex items-center gap-1 rounded-md bg-jdav-green/10 px-2.5 py-1.5 text-[11px] font-bold uppercase text-jdav-green transition-colors hover:bg-jdav-green hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            Annehmen
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => void handleStatusChange("cancelled")}
            className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2.5 py-1.5 text-[11px] font-bold uppercase text-red-700 transition-colors hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            Ablehnen
          </button>
        </>
      )}

      {currentStatus === "reserved" && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => void handleStatusChange("on loan")}
          className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2.5 py-1.5 text-[11px] font-bold uppercase text-blue-700 transition-colors hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          Ausgeben
        </button>
      )}

      {currentStatus === "on loan" && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => void handleStatusChange("returned")}
          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold uppercase text-slate-700 transition-colors hover:bg-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Rücknahme
        </button>
      )}

      {(currentStatus === "returned" || currentStatus === "cancelled") && (
        <span className="text-[11px] font-semibold text-slate-400">-</span>
      )}
    </div>
  );
}
