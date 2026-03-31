"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { bulkUpdateTourReservations } from "@/app/actions/admin-reservation";

interface TourBulkRow {
  tourId: string;
  tourTitle: string;
  requested: number;
  reserved: number;
  onLoan: number;
}

interface TourBulkReservationManagerProps {
  rows: TourBulkRow[];
}

interface FeedbackState {
  type: "success" | "error";
  message: string;
}

export function TourBulkReservationManager({
  rows,
}: TourBulkReservationManagerProps) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, FeedbackState>>({});

  async function runBulkAction(
    tourId: string,
    fromStatus: "requested" | "reserved" | "on loan",
    toStatus: "reserved" | "on loan" | "returned",
  ) {
    const key = `${tourId}:${fromStatus}:${toStatus}`;
    setPendingKey(key);

    const result = await bulkUpdateTourReservations(
      tourId,
      fromStatus,
      toStatus,
    );

    setPendingKey(null);

    if (result.error) {
      setFeedback((prev) => ({
        ...prev,
        [tourId]: { type: "error", message: result.error },
      }));
      return;
    }

    if ((result.failedCount || 0) > 0) {
      const reason = result.errors?.[0] ? ` (${result.errors[0]})` : "";
      setFeedback((prev) => ({
        ...prev,
        [tourId]: {
          type: "error",
          message: `${result.count} erfolgreich, ${result.failedCount} fehlgeschlagen${reason}`,
        },
      }));
      router.refresh();
      return;
    }

    setFeedback((prev) => ({
      ...prev,
      [tourId]: {
        type: "success",
        message: `${result.count} Reservierung(en) aktualisiert.`,
      },
    }));
    router.refresh();
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-base font-bold text-slate-900">
          Stapelverarbeitung je Tour
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Tourenbezogene Reservierungen in einem Schritt bestätigen, ausgeben
          oder zurücknehmen.
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.tourId}
            className="rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-900">{row.tourTitle}</p>
                <p className="text-xs text-slate-500">
                  Angefragt: {row.requested} | Reserviert: {row.reserved} |
                  Ausgeliehen: {row.onLoan}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {row.requested > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      void runBulkAction(row.tourId, "requested", "reserved")
                    }
                    disabled={pendingKey !== null}
                    className="inline-flex items-center gap-1 rounded-md bg-jdav-green px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-jdav-green-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pendingKey === `${row.tourId}:requested:reserved` && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    Alle annehmen
                  </button>
                )}

                {row.reserved > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      void runBulkAction(row.tourId, "reserved", "on loan")
                    }
                    disabled={pendingKey !== null}
                    className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pendingKey === `${row.tourId}:reserved:on loan` && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    Alle ausgeben
                  </button>
                )}

                {row.onLoan > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      void runBulkAction(row.tourId, "on loan", "returned")
                    }
                    disabled={pendingKey !== null}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-700 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pendingKey === `${row.tourId}:on loan:returned` && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    Alle zurücknehmen
                  </button>
                )}
              </div>
            </div>

            {feedback[row.tourId] && (
              <p
                className={`mt-2 text-xs font-medium ${
                  feedback[row.tourId].type === "success"
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                {feedback[row.tourId].message}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
