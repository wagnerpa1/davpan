"use client";

import { format } from "date-fns";
import { de } from "date-fns/locale";
import { AlertCircle, MapPin, User, X } from "lucide-react";
import { deleteResourceBooking } from "@/app/actions/admin-resources";
import { Button } from "@/components/ui/button";

interface ResourceBooking {
  id: string;
  start_date: string;
  end_date: string;
  status: string | null;
  reason?: string | null;
  resources?: { name?: string | null } | null;
  profiles?: { full_name?: string | null } | null;
  tours?: {
    id?: string | null;
    title?: string | null;
    tour_guides?: Array<{ profiles?: { full_name?: string | null } | null }>;
  } | null;
}

interface BookingDetailsModalProps {
  booking: ResourceBooking | null;
  onClose: () => void;
  onDeleted?: () => void;
}

export function BookingDetailsModal({
  booking,
  onClose,
  onDeleted,
}: BookingDetailsModalProps) {
  if (!booking) return null;

  const isTourBooking = !!booking.tours;
  const isStandaloneBooking = !booking.tours;
  const creatorName = booking.profiles?.full_name || "Unbekannt";
  const resourceName = booking.resources?.name || "Unbekannte Ressource";

  const handleDelete = async () => {
    if (
      confirm(
        "Möchten Sie diese Ressourcenbuchung wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
      )
    ) {
      try {
        const result = await deleteResourceBooking(booking.id);
        if (result?.error) {
          alert(`Fehler beim Löschen: ${result.error}`);
        } else {
          alert("Ressourcenbuchung erfolgreich gelöscht.");
          onDeleted?.();
          onClose();
        }
      } catch (err) {
        alert(
          err instanceof Error
            ? err.message
            : "Ein Fehler beim Löschen ist aufgetreten.",
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg animate-in fade-in zoom-in-95">
        <div className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isTourBooking ? booking.tours?.title : resourceName}
            </h2>
            <p className="text-sm text-slate-500">
              {isStandaloneBooking ? "Eigene Reservierung" : "Tour-Ressource"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-slate-100"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Resource Name (for standalone bookings) */}
          {isStandaloneBooking && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-jdav-green shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-600">Ressource</p>
                <p className="text-sm font-semibold text-slate-900">
                  {resourceName}
                </p>
              </div>
            </div>
          )}

          {/* Created By */}
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-jdav-green shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-600">
                {isTourBooking ? "Guides" : "Reserviert von"}
              </p>
              {isTourBooking ? (
                <p className="text-sm font-semibold text-slate-900">
                  {booking.tours?.tour_guides
                    ?.map((g) => g.profiles?.full_name)
                    .filter(Boolean)
                    .join(", ") || "Keine Guides"}
                </p>
              ) : (
                <p className="text-sm font-semibold text-slate-900">
                  {creatorName}
                </p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="flex items-start gap-3">
            <div className="h-5 w-5 text-jdav-green shrink-0 mt-0.5 flex items-center justify-center">
              📅
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Zeitraum</p>
              <p className="text-sm font-semibold text-slate-900">
                {format(new Date(booking.start_date), "dd.MM.yyyy HH:mm", {
                  locale: de,
                })}{" "}
                bis{" "}
                {format(new Date(booking.end_date), "dd.MM.yyyy HH:mm", {
                  locale: de,
                })}
              </p>
            </div>
          </div>

          {/* Reason (for standalone bookings only) */}
          {isStandaloneBooking && booking.reason && (
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-jdav-green shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Grund / Anlass
                </p>
                <p className="text-sm text-slate-900 mt-1 p-2 bg-slate-50 rounded border border-slate-200">
                  {booking.reason}
                </p>
              </div>
            </div>
          )}

          {/* Status Badge */}
          <div className="flex items-center gap-2 pt-2">
            <span className="text-sm font-medium text-slate-600">Status:</span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                booking.status === "requested"
                  ? "bg-yellow-100 text-yellow-800"
                  : booking.status === "booked"
                    ? "bg-green-100 text-green-800"
                    : "bg-slate-100 text-slate-800"
              }`}
            >
              {booking.status === "requested"
                ? "Angefordert"
                : booking.status === "booked"
                  ? "Gebucht"
                  : "Freigegeben"}
            </span>
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="border-t border-slate-200 p-5 flex gap-3">
          {isStandaloneBooking && (
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
            >
              Löschen
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className="flex-1">
            Schließen
          </Button>
        </div>
      </div>
    </div>
  );
}
