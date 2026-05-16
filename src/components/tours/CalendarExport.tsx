"use client";

import { google, ics, office365, outlook, yahoo } from "calendar-link";
import { CalendarPlus, Download, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface CalendarExportProps {
  title: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  startTime?: string | null;
  location?: string | null;
}

/**
 * CalendarExport component using calendar-link library.
 * Provides a dropdown with various calendar service links.
 */
export function CalendarExport({
  title,
  description,
  startDate,
  endDate,
  startTime,
  location,
}: CalendarExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const event = {
    title,
    description: description || "",
    start: startTime ? `${startDate} ${startTime}` : startDate,
    end: endDate || startDate,
    location: location || "",
  };

  const options = [
    { name: "Google Calendar", href: google(event), icon: ExternalLink },
    { name: "Outlook.com", href: outlook(event), icon: ExternalLink },
    { name: "Office 365", href: office365(event), icon: ExternalLink },
    { name: "Yahoo! Calendar", href: yahoo(event), icon: ExternalLink },
    { name: "iCal / ICS Datei", href: ics(event), icon: Download },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
        title="In Kalender speichern"
      >
        <CalendarPlus className="h-3.5 w-3.5" /> Kalender
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in duration-100">
          {options.map((option) => (
            <a
              key={option.name}
              href={option.href}
              target={option.name.includes("ICS") ? "_self" : "_blank"}
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-jdav-green transition-colors"
              onClick={() => setIsOpen(false)}
            >
              {option.name}
              <option.icon className="h-3 w-3 opacity-50" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
