import type { Frequency } from "@/features/data/model/types";
import { addDays, addMonths, dateInMonth, daysBetween, monthDiff } from "@/shared/lib/date";

// Every frequency in the order pickers show them
export const FREQUENCIES: Frequency[] = ["weekly", "monthly", "quarterly", "yearly"];

// How many times a schedule books in a year
const TIMES_A_YEAR: Record<Frequency, number> = { weekly: 52, monthly: 12, quarterly: 4, yearly: 1 };

// How many months apart the entries of a frequency fall, weekly ones excepted
const MONTH_STEP: Record<Exclude<Frequency, "weekly">, number> = { monthly: 1, quarterly: 3, yearly: 12 };

interface Timing {
  period?: Frequency;
  dayOfMonth: number;
  startMonth: string;
  endMonth?: string;
}

// An amount booked at a frequency as what it costs a month on average
export const perMonth = (amount: number, frequency: Frequency = "monthly"): number =>
  (amount * TIMES_A_YEAR[frequency]) / 12;

// Whether a schedule books in a month it spans: weekly ones every month
export const booksInMonth = (timing: Timing, month: string): boolean => {
  const frequency = timing.period ?? "monthly";
  if (frequency === "weekly") return true;
  const diff = monthDiff(timing.startMonth, month);
  return diff >= 0 && diff % MONTH_STEP[frequency] === 0;
};

// The next day a schedule books from a day on, or null when it ends first
export const nextBooking = (timing: Timing, from: string): string | null => {
  const frequency = timing.period ?? "monthly";
  const first = dateInMonth(timing.startMonth, timing.dayOfMonth);
  let next: string;
  if (frequency === "weekly") {
    next = first >= from ? first : addDays(first, Math.ceil(daysBetween(first, from) / 7) * 7);
  } else {
    const step = MONTH_STEP[frequency];
    const month = from.slice(0, 7);
    let at =
      timing.startMonth >= month
        ? timing.startMonth
        : addMonths(timing.startMonth, Math.ceil(monthDiff(timing.startMonth, month) / step) * step);
    if (dateInMonth(at, timing.dayOfMonth) < from) at = addMonths(at, step);
    next = dateInMonth(at, timing.dayOfMonth);
  }
  return timing.endMonth && next.slice(0, 7) > timing.endMonth ? null : next;
};

// How many times a schedule books in a month, inside its span
export const bookingsInMonth = (timing: Timing, month: string): number => {
  if (month < timing.startMonth || (timing.endMonth && month > timing.endMonth)) return 0;
  if ((timing.period ?? "monthly") !== "weekly") return booksInMonth(timing, month) ? 1 : 0;
  const first = dateInMonth(timing.startMonth, timing.dayOfMonth);
  const start = first > `${month}-01` ? first : `${month}-01`;
  const offset = (7 - (daysBetween(first, start) % 7)) % 7;
  let count = 0;
  for (let day = addDays(start, offset); day.startsWith(month); day = addDays(day, 7)) count++;
  return count;
};
