import { siteConfig } from "@/lib/site-config";

/**
 * Utilities for generating ICS (iCalendar) files for tours.
 * Follows RFC 5545 standard.
 */

export interface IcsEventOptions {
  title: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  meetingPoint?: string | null;
  meetingTime?: string | null;
  durationHours?: number | null;
  url?: string;
}

/**
 * Generates the content for an .ics file based on tour details.
 */
export function generateTourIcs(options: IcsEventOptions): string {
  const {
    title,
    description,
    startDate,
    meetingPoint,
    meetingTime,
    durationHours,
    url,
  } = options;

  // ICS dates must be in UTC format: YYYYMMDDTHHMMSSZ
  const formatIcsDate = (date: Date) => {
    return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
  };

  const start = new Date(startDate);
  const duration = durationHours || 5;
  const isEstimatedEnd = !durationHours;

  if (meetingTime) {
    const [hours, minutes] = meetingTime.split(":").map(Number);
    // Use local time from the database and convert to UTC for the ICS
    start.setHours(hours, minutes, 0);
  } else {
    // If no time, set to 08:00 local time
    start.setHours(8, 0, 0);
  }

  const end = new Date(start);
  end.setHours(start.getHours() + duration);

  const finalDescription = [
    description,
    isEstimatedEnd ? "Hinweis: Das Ende der Tour ist nicht festgesetzt." : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  // Escape special characters for ICS
  const escapeIcs = (str: string) =>
    str
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${siteConfig.icsProductId}`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `SUMMARY:${escapeIcs(title)}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `UID:${Math.random().toString(36).substring(2)}@jdav-pan.de`,
  ];

  if (finalDescription) {
    lines.push(`DESCRIPTION:${escapeIcs(finalDescription)}`);
  }

  if (meetingPoint) {
    lines.push(`LOCATION:${escapeIcs(meetingPoint)}`);
  }

  if (url) {
    lines.push(`URL:${url}`);
  }

  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}
