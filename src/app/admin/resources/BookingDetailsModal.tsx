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

function BookingHeader({
  isTourBooking,
  title,
  isStandaloneBooking,
  onClose,
}: {
  isTourBooking: boolean;
  title: string;
  isStandaloneBooking: boolean;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between border-b border-slate-200 p-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">
          {isTourBooking ? title : title}
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
  );
}

function BookingInfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 text-jdav-green">{icon}</div>
      <div>
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <div className="text-sm font-semibold text-slate-900">{value}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const className =
    status === "requested"
      ? "bg-yellow-100 text-yellow-800"
      : status === "booked"
        ? "bg-green-100 text-green-800"
        : "bg-slate-100 text-slate-800";

  const label =
    status === "requested"
      ? "Angefordert"
      : status === "booked"
        ? "Gebucht"
        : "Freigegeben";

  return (
    <div className="flex items-center gap-2 pt-2">
      <span className="text-sm font-medium text-slate-600">Status:</span>
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
      >
        {label}
      </span>
    </div>
  );
}

function BookingActions({
  isStandaloneBooking,
  onDelete,
  onClose,
}: {
  isStandaloneBooking: boolean;
  onDelete?: () => void;
  onClose: () => void;
}) {
  return (
    <div className="border-t border-slate-200 p-5 flex gap-3">
      {isStandaloneBooking && onDelete && (
        <Button variant="destructive" className="flex-1" onClick={onDelete}>
          Löschen
        </Button>
      )}
      <Button variant="outline" onClick={onClose} className="flex-1">
        Schließen
      </Button>
    </div>
  );
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
  const title = isTourBooking ? booking.tours?.title || "Tour" : resourceName;

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
        <BookingHeader
          isTourBooking={isTourBooking}
          title={title}
          isStandaloneBooking={isStandaloneBooking}
          onClose={onClose}
        />

        <div className="space-y-4 p-5">
          {isStandaloneBooking && (
            <BookingInfoRow
              icon={<MapPin className="h-5 w-5" />}
              label="Ressource"
              value={resourceName}
            />
          )}

          <BookingInfoRow
            icon={<User className="h-5 w-5" />}
            label={isTourBooking ? "Guides" : "Reserviert von"}
            value={
              isTourBooking
                ? booking.tours?.tour_guides
                    ?.reduce<string[]>((names, guide) => {
                      const fullName = guide.profiles?.full_name;
                      if (fullName) names.push(fullName);
                      return names;
                    }, [])
                    .join(", ") || "Keine Guides"
                : creatorName
            }
          />

          <BookingInfoRow
            icon={<span aria-hidden="true">📅</span>}
            label="Zeitraum"
            value={
              <>
                {format(new Date(booking.start_date), "dd.MM.yyyy HH:mm", {
                  locale: de,
                })}{" "}
                bis{" "}
                {format(new Date(booking.end_date), "dd.MM.yyyy HH:mm", {
                  locale: de,
                })}
              </>
            }
          />

          {isStandaloneBooking && booking.reason && (
            <BookingInfoRow
              icon={<AlertCircle className="h-5 w-5" />}
              label="Grund / Anlass"
              value={
                <span className="mt-1 block rounded border border-slate-200 bg-slate-50 p-2 text-sm text-slate-900">
                  {booking.reason}
                </span>
              }
            />
          )}

          <StatusBadge status={booking.status} />
        </div>

        <BookingActions
          isStandaloneBooking={isStandaloneBooking}
          onDelete={handleDelete}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
