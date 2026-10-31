import { counts } from "@/features/data/model/finmath";
import type { AppState } from "@/features/data/model/types";
import { addMonths, dateInMonth, daysInMonth, monthOf } from "@/shared/lib/date";
import { convert, ratesAt } from "@/shared/lib/money";

// The running total of some daily amounts
export const runningTotal = (values: readonly number[]): number[] => {
  let sum = 0;
  return values.map((value) => (sum += value));
};

// The spending of each of a month's first days, in the base currency
export const dailySpending = (state: AppState, month: string, days: number): number[] => {
  const { settings } = state;
  return Array.from({ length: days }, (_, index) => {
    const date = dateInMonth(month, index + 1);
    return state.transactions
      .filter((tx) => tx.type === "expense" && counts(tx) && tx.date === date)
      .reduce((sum, tx) => sum + convert(tx.amount, tx.currency, settings.baseCurrency, ratesAt(settings, tx.date)), 0);
  });
};

// How a month's spending adds up day by day against the whole month before
export const spendingPace = (state: AppState, month: string, today: string) => {
  const thisMonth = monthOf(today);
  let elapsed = 0;
  if (month === thisMonth) elapsed = Number(today.slice(8));
  else if (month < thisMonth) elapsed = daysInMonth(month);
  const previousMonth = addMonths(month, -1);
  const current = runningTotal(dailySpending(state, month, elapsed));
  const previous = runningTotal(dailySpending(state, previousMonth, daysInMonth(previousMonth)));
  return {
    elapsed,
    current,
    previous,
    soFar: current.at(-1) ?? 0,
    previousAtSameDay: previous[Math.min(elapsed, previous.length) - 1] ?? 0,
  };
};
