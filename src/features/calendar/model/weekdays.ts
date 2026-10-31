import { counts } from "@/features/data/model/finmath";
import type { AppState } from "@/features/data/model/types";
import { addDays } from "@/shared/lib/date";
import { convert, ratesAt } from "@/shared/lib/money";

export interface WeekdaySpend {
  weekday: number;
  average: number;
}

// The weekday of a date, Monday first
const weekdayOf = (date: string) => (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;

// What a day of each weekday costs on average over the last weeks, Monday first
export const weekdaySpending = (state: AppState, today: string, weeks = 12): WeekdaySpend[] => {
  const { settings } = state;
  const from = addDays(today, -weeks * 7 + 1);
  const totals = Array.from({ length: 7 }, () => 0);
  for (const tx of state.transactions) {
    if (tx.type !== "expense" || !counts(tx) || tx.date < from || tx.date > today) continue;
    const day = weekdayOf(tx.date);
    totals[day] =
      (totals[day] ?? 0) + convert(tx.amount, tx.currency, settings.baseCurrency, ratesAt(settings, tx.date));
  }
  return totals.map((total, weekday) => ({ weekday, average: total / weeks }));
};

// The weekday of today, Monday first
export const todayWeekday = (today: string): number => weekdayOf(today);
