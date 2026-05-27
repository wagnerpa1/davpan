"use client";

import { useState } from "react";
import { ResourceCalendar } from "./ResourceCalendar";
import { StandaloneBookingForm } from "./StandaloneBookingForm";

interface Resource {
  id: string;
  name: string | null;
  description: string | null;
  type: string | null;
  capacity: number | null;
}

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

interface ResourceCalendarWrapperProps {
  resources: Resource[];
  bookings: ResourceBooking[];
}

export function ResourceCalendarWrapper({
  resources,
  bookings,
}: ResourceCalendarWrapperProps) {
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [calendarBookings, _setCalendarBookings] =
    useState<ResourceBooking[]>(bookings);

  const handleBookingSuccess = () => {
    setShowBookingForm(false);
  };

  return (
    <div className="space-y-6">
      {!showBookingForm && (
        <button
          type="button"
          onClick={() => setShowBookingForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-jdav-green hover:bg-jdav-green-dark text-white font-bold rounded-xl transition shadow-sm"
        >
          + Ressource außerhalb einer Tour reservieren
        </button>
      )}

      {showBookingForm && (
        <StandaloneBookingForm
          resources={resources}
          onSuccess={handleBookingSuccess}
          onCancel={() => setShowBookingForm(false)}
        />
      )}

      <div className="min-h-150 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-6">
          Buchungs-Kalender
        </h2>
        <ResourceCalendar bookings={calendarBookings} />
      </div>
    </div>
  );
}
