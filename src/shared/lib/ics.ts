// A day of a calendar file, an event that lasts the whole day
export interface IcsEvent {
  uid: string;
  date: string;
  title: string;
  description?: string;
}

// The longest line a calendar file may hold, in bytes, before it folds
const LINE_BYTES = 75;

// Text with the characters a calendar file reserves written out
const escapeText = (text: string): string =>
  text.replaceAll("\\", "\\\\").replaceAll(";", "\\;").replaceAll(",", "\\,").replaceAll(/\r?\n/gu, "\\n");

// A line folded into 75-byte pieces, each next one starting with a space
const fold = (line: string): string[] => {
  const encoder = new TextEncoder();
  const pieces: string[] = [];
  let piece = "";
  for (const char of line) {
    const limit = pieces.length === 0 ? LINE_BYTES : LINE_BYTES - 1;
    if (encoder.encode(piece + char).length > limit) {
      pieces.push(piece);
      piece = "";
    }
    piece += char;
  }
  pieces.push(piece);
  return pieces.map((part, index) => (index === 0 ? part : ` ${part}`));
};

// A day as 20261105
const compact = (date: string): string => date.replaceAll("-", "");

// The day after a day, as 20261106
const nextDay = (date: string): string => {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10).replaceAll("-", "");
};

// A calendar file of whole-day events, as calendar apps subscribe to it
export const icsCalendar = (name: string, events: readonly IcsEvent[], now: Date): string => {
  const stamp = `${now.toISOString().slice(0, 19).replaceAll(/[-:]/gu, "")}Z`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Finance//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    "X-PUBLISHED-TTL:PT6H",
    ...events.flatMap((event) => [
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(event.date)}`,
      `DTEND;VALUE=DATE:${nextDay(event.date)}`,
      `SUMMARY:${escapeText(event.title)}`,
      ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return `${lines.flatMap(fold).join("\r\n")}\r\n`;
};
