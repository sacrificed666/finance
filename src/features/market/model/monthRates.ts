import type { AppState, Settings } from "@/features/data/model/types";
import { monthOf } from "@/shared/lib/date";
import { isRecord, readNumber } from "@/shared/lib/guards";

export type MonthRates = NonNullable<Settings["monthRates"]>;

const MONTH = /^\d{4}-\d{2}$/u;

// The ended months lacking an average rate, newest first, when one is needed
export const monthsNeedingRates = (state: AppState, currentMonth: string, limit = 12): string[] => {
  const foreign =
    state.settings.baseCurrency !== "UAH" ||
    state.transactions.some((tx) => tx.currency !== "UAH") ||
    state.budgets.some((budget) => budget.currency !== "UAH");
  if (!foreign) return [];
  const known = state.settings.monthRates ?? {};
  const months = new Set<string>();
  for (const tx of state.transactions) {
    const month = monthOf(tx.date);
    if (month < currentMonth && !known[month]) months.add(month);
  }
  return [...months].toSorted((a, b) => b.localeCompare(a)).slice(0, limit);
};

// The mean of the NBU's daily rates in a month's answer, to four places
export const averageRate = (rows: unknown): number | null => {
  if (!Array.isArray(rows)) return null;
  const rates = rows
    .map((row) => readNumber(row, "rate_per_unit") ?? readNumber(row, "rate"))
    .filter((rate): rate is number => rate !== null && rate > 0);
  if (rates.length === 0) return null;
  return Math.round((rates.reduce((sum, rate) => sum + rate, 0) / rates.length) * 10_000) / 10_000;
};

// The well-formed months of stored month rates, the last 600 at most
export const normalizeMonthRates = (value: unknown): MonthRates | undefined => {
  if (!isRecord(value)) return undefined;
  const rates: MonthRates = {};
  for (const [month, entry] of Object.entries(value).slice(-600)) {
    const usd = readNumber(entry, "USD");
    const eur = readNumber(entry, "EUR");
    if (MONTH.test(month) && usd !== null && eur !== null && usd > 0 && eur > 0) rates[month] = { USD: usd, EUR: eur };
  }
  return Object.keys(rates).length > 0 ? rates : undefined;
};
