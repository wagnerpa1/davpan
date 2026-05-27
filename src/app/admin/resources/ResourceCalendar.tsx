"use client";

import { format, getDay, parse, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  type View,
  Views,
} from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { BookingDetailsModal } from "./BookingDetailsModal";

const locales = {
  de: de,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const calendarMessages = {
  next: "Vor",
  previous: "Zurück",
  today: "Heute",
  month: "Monat",
  week: "Woche",
  day: "Tag",
  agenda: "Agenda",
  date: "Datum",
  time: "Zeit",
  event: "Buchung",
  noEventsInRange: "Keine Buchungen in diesem Zeitraum.",
};

interface ResourceCalendarProps {
  bookings: ResourceBooking[];
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

interface CalendarBookingEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: ResourceBooking;
}

export function ResourceCalendar({ bookings }: ResourceCalendarProps) {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>(Views.MONTH);
  const [selectedEvent, setSelectedEvent] =
    useState<CalendarBookingEvent | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const syncViewport = () => {
      setIsMobile(mediaQuery.matches);
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  const events: CalendarBookingEvent[] = useMemo(
    () =>
      bookings.map((booking) => ({
        id: booking.id,
        title: booking.tours
          ? `${booking.tours.title}`
          : `${booking.resources?.name} - Privat`,
        start: new Date(booking.start_date),
        end: new Date(booking.end_date),
        allDay: true,
        resource: booking,
      })),
    [bookings],
  );

  const handleSelectEvent = useCallback((event: CalendarBookingEvent) => {
    setSelectedEvent(event);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  const handleDeleted = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  const mobileEvents = useMemo(() => {
    return [...events]
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .filter((event) => {
        return (
          event.start.getMonth() === date.getMonth() &&
          event.start.getFullYear() === date.getFullYear()
        );
      });
  }, [date, events]);

  const eventPropGetter = useCallback((event: CalendarBookingEvent) => {
    const isTourBooking = !!event.resource.tours;
    const backgroundColor = isTourBooking
      ? event.resource.status === "requested"
        ? "#f59e0b"
        : "#76a355"
      : "#94a3b8"; // Gray for standalone bookings

    return {
      style: {
        backgroundColor,
        borderRadius: "8px",
        border: "none",
        display: "block",
        fontSize: "12px",
        fontWeight: "bold",
      },
    };
  }, []);

  return (
    <div className="relative h-full">
      {isMobile ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setDate(
                    (currentDate) =>
                      new Date(
                        currentDate.getFullYear(),
                        currentDate.getMonth() - 1,
                        1,
                      ),
                  )
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Zur\u00fcck
              </button>
              <p className="text-sm font-bold text-slate-800">
                {format(date, "MMMM yyyy", { locale: de })}
              </p>
              <button
                type="button"
                onClick={() =>
                  setDate(
                    (currentDate) =>
                      new Date(
                        currentDate.getFullYear(),
                        currentDate.getMonth() + 1,
                        1,
                      ),
                  )
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
              >
                Vor <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Mobile Kalenderliste ohne horizontales Scrollen.
            </p>
          </div>

          <div className="space-y-2">
            {mobileEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                Keine Buchungen in diesem Monat.
              </div>
            ) : (
              mobileEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => handleSelectEvent(event)}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm"
                >
                  <p className="text-sm font-bold text-slate-900">
                    {event.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {format(event.start, "dd.MM.yyyy", { locale: de })} -{" "}
                    {format(event.end, "dd.MM.yyyy", { locale: de })}
                  </p>
                  <p className="mt-2 inline-flex rounded-full bg-jdav-green/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-jdav-green">
                    {event.resource.resources?.name || "Ressource"}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 650 }}
          culture="de"
          date={date}
          onNavigate={(newDate) => setDate(newDate)}
          view={view}
          onView={(newView) => setView(newView)}
          onSelectEvent={handleSelectEvent}
          messages={calendarMessages}
          eventPropGetter={eventPropGetter}
        />
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <BookingDetailsModal
            booking={selectedEvent.resource}
            onClose={closeModal}
            onDeleted={handleDeleted}
          />
        </div>
      )}
    </div>
  );
}
