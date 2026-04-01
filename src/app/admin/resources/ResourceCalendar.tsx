"use client";

import { format, getDay, parse, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Link as LinkIcon,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  type View,
  Views,
} from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";

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
    const backgroundColor =
      event.resource.status === "requested" ? "#f59e0b" : "#76a355";

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
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
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
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                Keine Buchungen in diesem Monat.
              </div>
            ) : (
              mobileEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => handleSelectEvent(event)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm"
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

      {/* Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="relative bg-slate-50 border-b border-slate-100 p-6 pt-8">
              <button
                type="button"
                onClick={closeModal}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-jdav-green/10 text-jdav-green">
                  <CalendarIcon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                  Buchungs-Details
                </h3>
              </div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                {selectedEvent.resource.resources?.name}
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Tour Context */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-400">
                  <LinkIcon className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Zugehörige Tour
                  </span>
                </div>
                {selectedEvent.resource.tours ? (
                  <Link
                    href={`/touren/${selectedEvent.resource.tours.id}`}
                    className="group block p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-jdav-green hover:bg-green-50 transition-all"
                  >
                    <div className="font-bold text-slate-900 group-hover:text-jdav-green transition-colors">
                      {selectedEvent.resource.tours.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Klicken zum Öffnen der Tour-Details
                    </div>
                  </Link>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-800 text-sm italic">
                    Private Buchung (nicht an eine Tour gekoppelt)
                  </div>
                )}
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-400">
                    <User className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Leiter / Guide
                    </span>
                  </div>
                  <div className="font-bold text-slate-800">
                    {selectedEvent.resource.tours?.tour_guides?.[0]?.profiles
                      ?.full_name || "–"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-400">
                    <User className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Gebucht von
                    </span>
                  </div>
                  <div className="font-bold text-slate-800">
                    {selectedEvent.resource.profiles?.full_name || "Unbekannt"}
                  </div>
                </div>
              </div>

              {/* Zeitraum */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Zeitraum
                  </span>
                </div>
                <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <div className="flex-1 text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">
                      Von
                    </div>
                    <div className="font-bold text-slate-900">
                      {format(selectedEvent.start, "dd.MM.yyyy", {
                        locale: de,
                      })}
                    </div>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="flex-1 text-center">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">
                      Bis
                    </div>
                    <div className="font-bold text-slate-900">
                      {format(selectedEvent.end, "dd.MM.yyyy", { locale: de })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 pt-0 bg-white">
              <button
                type="button"
                onClick={closeModal}
                className="w-full bg-slate-900 hover:bg-slate-700 text-white font-black py-4 rounded-2xl transition shadow-lg shadow-slate-900/10"
              >
                Fertig
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
