"use client";

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

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
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
    <select
      disabled={isPending}
      value={currentStatus || "requested"}
      onChange={handleStatusChange}
      className={`text-xs font-bold rounded-lg border-slate-200 py-1.5 pl-2 pr-6 cursor-pointer focus:ring-1 focus:ring-jdav-green ${isPending ? "opacity-50" : ""}`}
    >
      <option value="requested">Angefragt</option>
      <option value="reserved">Reservieren</option>
      <option value="on loan">Ausgeben</option>
      <option value="returned">Zurücknehmen</option>
      <option value="cancelled">Stornieren</option>
    </select>
  );
}
