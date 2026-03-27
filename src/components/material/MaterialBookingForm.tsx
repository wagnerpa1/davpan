"use client";

import { Loader2 } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { createIndependentMaterialReservation } from "@/app/actions/material";
import { Button } from "@/components/ui/button";

interface MaterialBookingFormProps {
  materialId: string;
  materialName: string;
  availableSizes: { id: string; size: string }[];
  isLoggedIn: boolean;
}

export function MaterialBookingForm({
  materialId,
  materialName,
  availableSizes,
  isLoggedIn,
}: MaterialBookingFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [inventoryId, setInventoryId] = useState<string>(
    availableSizes[0]?.id || "",
  );

  // Quick hack: Tomorrow as default loan date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultLoan = tomorrow.toISOString().split("T")[0];

  const in3Days = new Date();
  in3Days.setDate(in3Days.getDate() + 3);
  const defaultReturn = in3Days.toISOString().split("T")[0];

  const [loanDate, setLoanDate] = useState(defaultLoan);
  const [returnDate, setReturnDate] = useState(defaultReturn);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn) return;
    setIsPending(true);
    setError(null);

    const formData = new FormData();
    formData.append("inventoryId", inventoryId);
    formData.append("loanDate", loanDate);
    formData.append("returnDate", returnDate);

    const result = await createIndependentMaterialReservation(formData);

    setIsPending(false);
    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      setSuccess(result.message);
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="w-full text-center text-xs text-slate-500 italic mt-2">
        (Bitte einloggen zum Reservieren)
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-xl bg-green-50 p-4 text-center text-sm font-medium text-green-800">
        {success}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 mt-2"
      aria-label={`Reservierung für ${materialName}`}
      data-material-id={materialId}
    >
      {error && (
        <div className="rounded-lg bg-red-50 p-2 text-xs font-medium text-red-800">
          {error}
        </div>
      )}

      {availableSizes.length > 0 && (
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`size-${materialId}`}
            className="text-xs font-bold text-slate-500 uppercase tracking-tight"
          >
            Größe / Variante
          </label>
          <select
            id={`size-${materialId}`}
            value={inventoryId}
            onChange={(e) => setInventoryId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
          >
            {availableSizes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.size || "Universalgröße"}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex flex-col gap-1 flex-1">
          <label
            htmlFor={`loan-date-${materialId}`}
            className="text-xs font-bold text-slate-500 uppercase tracking-tight"
          >
            Von
          </label>
          <input
            id={`loan-date-${materialId}`}
            type="date"
            value={loanDate}
            onChange={(e) => setLoanDate(e.target.value)}
            required
            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label
            htmlFor={`return-date-${materialId}`}
            className="text-xs font-bold text-slate-500 uppercase tracking-tight"
          >
            Bis
          </label>
          <input
            id={`return-date-${materialId}`}
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            required
            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="mt-2 w-full bg-jdav-green hover:bg-jdav-green-dark text-white font-bold h-10 rounded-xl"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          "Anfragen"
        )}
      </Button>
    </form>
  );
}
