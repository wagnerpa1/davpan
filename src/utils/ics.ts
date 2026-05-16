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
    endDate,
    meetingPoint,
    meetingTime,
    url,
  } = options;

  // ICS dates must be in UTC format: YYYYMMDDTHHMMSSZ
  const formatIcsDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const start = new Date(startDate);
  if (meetingTime) {
    const [hours, minutes] = meetingTime.split(":").map(Number);
    // Use local time from the database and convert to UTC for the ICS
    start.setHours(hours, minutes, 0);
  } else {
    // If no time, set to 08:00 local time
    start.setHours(8, 0, 0);
  }

  const end = endDate ? new Date(endDate) : new Date(start);
  if (endDate) {
    if (meetingTime) {
      const [hours, minutes] = meetingTime.split(":").map(Number);
      end.setHours(hours + 2, minutes, 0); // Default 2h duration
    } else {
      end.setHours(17, 0, 0); // End of day
    }
  } else {
    // Single day
    end.setHours(start.getHours() + 4); // Default 4h duration for single day if time is known
  }

  // Escape special characters for ICS
  const escape = (str: string) =>
    str
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JDAV Pfarrkirchen//Tour Management//DE",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `SUMMARY:${escape(title)}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `UID:${Math.random().toString(36).substring(2)}@jdav-pan.de`,
  ];

  if (description) {
    lines.push(`DESCRIPTION:${escape(description)}`);
  }

  if (meetingPoint) {
    lines.push(`LOCATION:${escape(meetingPoint)}`);
  }

  if (url) {
    lines.push(`URL:${url}`);
  }

  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}
