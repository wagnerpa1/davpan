"use client";

import { CalendarDays, ChevronDown, Inbox } from "lucide-react";
import { useMemo, useState } from "react";
import { TourCard } from "@/components/tours/TourCard";
import {
  getRegistrationDisplayLabel,
  type RegistrationTab,
  type UserTourRegistration,
} from "@/lib/tours/registration-overview";
import { cn } from "@/lib/utils";

interface MyTourRegistrationsPanelProps {
  tabs: RegistrationTab[];
}

function sortRegistrations(registrations: UserTourRegistration[]) {
  return [...registrations].sort((left, right) => {
    const leftDate = left.tour.start_date
      ? Date.parse(left.tour.start_date)
      : 0;
    const rightDate = right.tour.start_date
      ? Date.parse(right.tour.start_date)
      : 0;

    return leftDate - rightDate;
  });
}

function getArchiveYear(registration: UserTourRegistration) {
  const dateValue = registration.tour.end_date ?? registration.tour.start_date;

  if (!dateValue) {
    return "Unbekannt";
  }

  const date = new Date(dateValue);

  return Number.isNaN(date.getTime())
    ? "Unbekannt"
    : String(date.getFullYear());
}

function groupArchiveRegistrationsByYear(
  registrations: UserTourRegistration[],
) {
  const grouped = registrations.reduce<Record<string, UserTourRegistration[]>>(
    (accumulator, registration) => {
      const year = getArchiveYear(registration);

      if (!accumulator[year]) {
        accumulator[year] = [];
      }

      accumulator[year].push(registration);
      return accumulator;
    },
    {},
  );

  return Object.entries(grouped).sort(([leftYear], [rightYear]) => {
    if (leftYear === "Unbekannt") {
      return 1;
    }

    if (rightYear === "Unbekannt") {
      return -1;
    }

    return Number(rightYear) - Number(leftYear);
  });
}

function isPastTour(registration: UserTourRegistration) {
  const relevantDate =
    registration.tour.end_date ?? registration.tour.start_date ?? null;
  if (!relevantDate) {
    return false;
  }

  const now = new Date();
  const date = new Date(relevantDate);
  return Number.isFinite(date.getTime()) && date.getTime() < now.getTime();
}

function isArchivedRegistration(registration: UserTourRegistration) {
  return (
    registration.tour.status === "completed" ||
    registration.tour.status === "cancelled" ||
    isPastTour(registration)
  );
}

function RegistrationCard({
  registration,
  participantLabel,
}: {
  registration: UserTourRegistration;
  participantLabel: string;
}) {
  const statusLabel = getRegistrationDisplayLabel(
    registration.status,
    registration.waitlist_position,
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
          {participantLabel}
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-1",
            registration.status === "confirmed" &&
              "bg-green-100 text-green-700",
            registration.status === "pending" && "bg-amber-100 text-amber-700",
            registration.status === "waitlist" && "bg-blue-100 text-blue-700",
            registration.status === "cancelled" &&
              "bg-slate-200 text-slate-600",
          )}
        >
          {statusLabel}
        </span>
      </div>
      <TourCard tour={registration.tour} />
    </div>
  );
}

function RegistrationGroup({
  title,
  registrations,
  emptyLabel,
  participantLabel,
}: {
  title: string;
  registrations: UserTourRegistration[];
  emptyLabel: string;
  participantLabel: string;
}) {
  if (registrations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-slate-500">
        <Inbox className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-700">{title}</p>
        <p className="mt-1 text-sm">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-jdav-green" />
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      </div>
      <div className="space-y-4">
        {registrations.map((registration) => (
          <RegistrationCard
            key={registration.id}
            registration={registration}
            participantLabel={participantLabel}
          />
        ))}
      </div>
    </div>
  );
}

function ArchiveRow({
  registration,
  participantLabel,
}: {
  registration: UserTourRegistration;
  participantLabel: string;
}) {
  const statusLabel = getRegistrationDisplayLabel(
    registration.status,
    registration.waitlist_position,
  );
  const relevantDate =
    registration.tour.end_date ?? registration.tour.start_date;
  const formattedDate = relevantDate
    ? new Intl.DateTimeFormat("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(relevantDate))
    : "Ohne Datum";

  return (
    <li className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">
            {registration.tour.title}
          </p>
          <p className="text-sm text-slate-500">{formattedDate}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
            {participantLabel}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
            {statusLabel}
          </span>
        </div>
      </div>
    </li>
  );
}

function ArchiveSection({
  registrations,
  participantLabel,
}: {
  registrations: UserTourRegistration[];
  participantLabel: string;
}) {
  const groupedRegistrations = useMemo(
    () => groupArchiveRegistrationsByYear(registrations),
    [registrations],
  );

  if (registrations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-slate-500">
        <Inbox className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-700">Archiv</p>
        <p className="mt-1 text-sm">
          Noch keine archivierten Touren vorhanden.
        </p>
      </div>
    );
  }

  return (
    <details
      className="rounded-2xl border border-slate-200 bg-white shadow-sm"
      open
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-jdav-green-dark">
            Archiv
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Vergangene Touren nach Jahren gruppiert.
          </p>
        </div>
        <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
      </summary>

      <div className="border-t border-slate-100 px-5 py-5">
        <div className="space-y-3">
          {groupedRegistrations.map(([year, yearRegistrations]) => (
            <details
              key={year}
              className="rounded-xl border border-slate-200 bg-slate-50"
              open={year !== "Unbekannt"}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    {year}
                  </p>
                  <p className="text-sm text-slate-500">
                    {yearRegistrations.length} Tour
                    {yearRegistrations.length === 1 ? "" : "en"}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
              </summary>

              <div className="border-t border-slate-100 px-4 py-4">
                <ul className="space-y-3">
                  {yearRegistrations.map((registration) => (
                    <ArchiveRow
                      key={registration.id}
                      registration={registration}
                      participantLabel={participantLabel}
                    />
                  ))}
                </ul>
              </div>
            </details>
          ))}
        </div>
      </div>
    </details>
  );
}

export function MyTourRegistrationsPanel({
  tabs,
}: MyTourRegistrationsPanelProps) {
  const [activeTabId, setActiveTabId] = useState(() => {
    const tabWithRegistrations = tabs.find(
      (tab) => tab.registrations.length > 0,
    );

    return tabWithRegistrations?.id ?? tabs[0]?.id ?? "self";
  });

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null,
    [activeTabId, tabs],
  );

  const activeRegistrations = useMemo(
    () =>
      sortRegistrations(
        (activeTab?.registrations ?? []).filter(
          (registration) => !isArchivedRegistration(registration),
        ),
      ),
    [activeTab],
  );
  const archiveRegistrations = useMemo(
    () =>
      sortRegistrations(
        (activeTab?.registrations ?? []).filter((registration) =>
          isArchivedRegistration(registration),
        ),
      ),
    [activeTab],
  );

  const participantLabel = activeTab?.label ?? "Ich";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8">
      <section className="space-y-4 border-b border-slate-200 pb-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-jdav-green-dark">
            Meine Touren
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Deine Anmeldungen im Überblick
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Hier siehst du bestätigte, offene und archivierte Anmeldungen.
          </p>
        </div>

        {tabs.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 pt-1">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab?.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTabId(tab.id)}
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                    isActive
                      ? "border-jdav-green bg-jdav-green text-white"
                      : "border-green-100 bg-white text-slate-700 hover:border-jdav-green hover:text-jdav-green-dark",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-8">
        <div className="space-y-4">
          <RegistrationGroup
            title="Aktive Anmeldungen"
            registrations={activeRegistrations}
            emptyLabel="Für diesen Bereich sind aktuell keine offenen oder bestätigten Anmeldungen vorhanden."
            participantLabel={participantLabel}
          />
        </div>

        <ArchiveSection
          registrations={archiveRegistrations}
          participantLabel={participantLabel}
        />
      </section>
    </div>
  );
}
