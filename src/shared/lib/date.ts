import { formatLocale } from "@/shared/i18n/format";

// Today's date in local time, as 2026-04-15
export const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// This month, as 2026-04
export const currentMonth = (): string => {
  return todayISO().slice(0, 7);
};

// The month a date falls in
export const monthOf = (dateISO: string): string => {
  return dateISO.slice(0, 7);
};

// The numbers of a date or month as [year, month, day], a missing part as 1
const numbersOf = (text: string): [number, number, number] => {
  const parts = text.split("-").map(Number);
  return [parts.at(0) ?? 0, parts.at(1) ?? 1, parts.at(2) ?? 1];
};

// A number as two digits
export const pad = (n: number): string => {
  return String(n).padStart(2, "0");
};

// The month some months after another, or before when negative
export const addMonths = (month: string, n: number): string => {
  const [y, m] = numbersOf(month);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${pad(nm)}`;
};

// The months from one month to another
export const monthDiff = (a: string, b: string): number => {
  const [ya, ma] = numbersOf(a);
  const [yb, mb] = numbersOf(b);
  return (yb - ya) * 12 + (mb - ma);
};

// The days in a month
export const daysInMonth = (month: string): number => {
  const [y, m] = numbersOf(month);
  return new Date(y, m, 0).getDate();
};

// A day of the month, held to its last day
export const dateInMonth = (month: string, day: number): string => {
  return `${month}-${pad(Math.min(day, daysInMonth(month)))}`;
};

// The whole days from one date to another, negative when the second comes first
export const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

// The date some days after another, or before when negative
export const addDays = (dateISO: string, n: number): string => {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// The years between two dates as a fraction, never below zero
export const yearsBetween = (fromISO: string, toISO: string): number => {
  const from = new Date(`${fromISO}T00:00:00`);
  const to = new Date(`${toISO}T00:00:00`);
  return Math.max(0, (to.getTime() - from.getTime()) / (365.25 * 24 * 3600 * 1000));
};

// The whole months between two dates, never below zero
export const wholeMonthsBetween = (fromISO: string, toISO: string): number => {
  const [fy, fm, fd] = numbersOf(fromISO);
  const [ty, tm, td] = numbersOf(toISO);
  let months = (ty - fy) * 12 + (tm - fm);
  if (td < fd) months -= 1;
  return Math.max(0, months);
};

// Formatters by language and options
const dtfCache = new Map<string, Intl.DateTimeFormat>();

// A cached date formatter for the current language in UTC
const dtf = (options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat => {
  const locale = formatLocale();
  const key = `${locale}|${JSON.stringify(options)}`;
  let fmt = dtfCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...options });
    dtfCache.set(key, fmt);
  }
  return fmt;
};

// Noon UTC on a day, so no time zone shifts it to another
const utc = (y: number, m: number, d = 1): Date => {
  return new Date(Date.UTC(y, m - 1, d, 12));
};

// The text with its first letter in capitals
const capitalize = (s: string): string => {
  return s.charAt(0).toLocaleUpperCase(formatLocale()) + s.slice(1);
};

// The text without a trailing dot
const stripDot = (s: string): string => {
  return s.replace(/\.$/, "");
};

// Month names by language and style
const namesCache = new Map<string, string[]>();

// The twelve month names, long or short, cached per language
const names = (style: "long" | "short"): string[] => {
  const key = `${formatLocale()}|${style}`;
  let list = namesCache.get(key);
  if (!list) {
    const fmt = dtf({ month: style });
    list = Array.from({ length: 12 }, (_, i) => {
      const raw = fmt.format(utc(2024, i + 1));
      return capitalize(style === "short" ? stripDot(raw) : raw);
    });
    namesCache.set(key, list);
  }
  return list;
};

// The full month names
export const monthNames = (): string[] => {
  return names("long");
};

// The short month names
export const monthNamesShort = (): string[] => {
  return names("short");
};

// A month as "April 2026"
export const formatMonth = (month: string): string => {
  const [y, m] = numbersOf(month);
  return `${monthNames()[m - 1] ?? ""} ${String(y)}`;
};

// A month inside a sentence, cased and written as the language does it
export const formatMonthText = (month: string): string => {
  const [y, m] = numbersOf(month);
  return dtf({ month: "long", year: "numeric" }).format(utc(y, m));
};

// A month's name without its year inside a sentence, as the language writes it
export const formatMonthNameText = (month: string): string => {
  const [, m] = numbersOf(month);
  return dtf({ month: "long" }).format(utc(2024, m));
};

// A month as "Apr"
export const formatMonthShort = (month: string): string => {
  const [, m] = numbersOf(month);
  return monthNamesShort()[m - 1] ?? "";
};

// A month as "Apr 2026"
export const formatMonthCompact = (month: string): string => {
  const [y, m] = numbersOf(month);
  return `${monthNamesShort()[m - 1] ?? ""} ${String(y)}`;
};

// A date with day, short month and year
export const formatDate = (dateISO: string): string => {
  const [y, m, d] = numbersOf(dateISO);
  return dtf({ day: "numeric", month: "short", year: "numeric" }).format(utc(y, m, d));
};

// A date with day and short month
export const formatDateShort = (dateISO: string): string => {
  const [, m, d] = numbersOf(dateISO);
  return dtf({ day: "numeric", month: "short" }).format(utc(2024, m, d));
};

// A moment with date and time, or the date when it has none
export const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return formatDate(iso.slice(0, 10));
  return new Intl.DateTimeFormat(formatLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

// A moment's hours and minutes, empty when it is not a date
export const formatTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(formatLocale(), { hour: "2-digit", minute: "2-digit" }).format(d);
};

// The hour of the day on this device
export const currentHour = (): number => new Date().getHours();

// A date as its weekday, day and month: "Tuesday, 27 October"
export const formatDay = (dateISO: string): string => {
  const [y, m, d] = numbersOf(dateISO);
  return capitalize(dtf({ weekday: "long", day: "numeric", month: "long" }).format(utc(y, m, d)));
};

// A date's short weekday
export const formatWeekday = (dateISO: string): string => {
  const [y, m, d] = numbersOf(dateISO);
  return capitalize(dtf({ weekday: "short" }).format(utc(y, m, d)));
};

// A date in numbers the way the page language writes them, such as 28.10.2026
export const formatDateNumeric = (dateISO: string): string => {
  const [y, m, d] = numbersOf(dateISO);
  return dtf({ day: "2-digit", month: "2-digit", year: "numeric" }).format(utc(y, m, d));
};

// The order of day, month and year in the page language's numeric dates
const dateOrder = (): string[] =>
  dtf({ day: "2-digit", month: "2-digit", year: "numeric" })
    .formatToParts(utc(2026, 11, 28))
    .map((part) => part.type)
    .filter((type) => type === "day" || type === "month" || type === "year");

// A typed date, ISO or in the page's numeric order, as ISO; null for no day
export const parseDateInput = (text: string): string | null => {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/u.exec(text.trim());
  const groups = iso ? [iso[1], iso[2], iso[3]] : (text.match(/\d+/gu) ?? []);
  if (groups.length !== 3) return null;
  const order = iso ? ["year", "month", "day"] : dateOrder();
  if (![2, 4].includes(groups[order.indexOf("year")]?.length ?? 0)) return null;
  // The number typed where the order puts a part of the date
  const part = (type: string) => Number(groups[order.indexOf(type)]);
  const year = part("year") < 100 ? 2000 + part("year") : part("year");
  const month = part("month");
  const day = part("day");
  if (year < 1900 || month < 1 || month > 12 || day < 1) return null;
  if (day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
  return `${String(year)}-${pad(month)}-${pad(day)}`;
};

// A date's weekday in full
export const formatWeekdayLong = (dateISO: string): string => {
  const [y, m, d] = numbersOf(dateISO);
  return capitalize(dtf({ weekday: "long" }).format(utc(y, m, d)));
};

// A date's weekday inside a sentence, cased as the language writes it
export const formatWeekdayText = (dateISO: string): string => {
  const [y, m, d] = numbersOf(dateISO);
  return dtf({ weekday: "long" }).format(utc(y, m, d));
};

// The time of the next whole hour
export const nextHourLabel = (): string => {
  const next = new Date();
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return formatTime(next.toISOString());
};
