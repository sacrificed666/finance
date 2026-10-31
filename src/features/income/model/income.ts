import { counts, historyMonths, monthlySeries, taxPaid } from "@/features/data/model/finmath";
import type { AppState, IncomeBreakdown, TaxRegimeId, Transaction } from "@/features/data/model/types";
import { descendantsOf } from "@/features/transactions/model/categories";
import { addMonths, dateInMonth, daysBetween, monthOf } from "@/shared/lib/date";
import { matchesQuery } from "@/shared/lib/listing";
import { convert, CURRENCIES, formatMoney, ratesAt, type Currency } from "@/shared/lib/money";

import { regimeAnnualHeadroom, type Headroom } from "./tax";

// The base-currency amount of an income entry at the rates of its day
export const incomeInBase = (state: AppState, tx: Transaction) =>
  convert(tx.amount, tx.currency, state.settings.baseCurrency, ratesAt(state.settings, tx.date));

// A month's income up to a day of it, in the base currency
const incomeByDay = (state: AppState, month: string, day: number): number =>
  state.transactions
    .filter((tx) => tx.type === "income" && counts(tx) && monthOf(tx.date) === month && Number(tx.date.slice(8)) <= day)
    .reduce((sum, tx) => sum + incomeInBase(state, tx), 0);

// The income page's headline figures for this month, the last months and the year
export const incomeSummary = (state: AppState, today: string) => {
  const { settings } = state;
  const base = settings.baseCurrency;
  const month = monthOf(today);
  const year = month.slice(0, 4);
  const series = monthlySeries(state.transactions, month, 12, settings);
  const thisMonth = series.at(-1)?.income ?? 0;
  const recent = series.filter((entry) => entry.month < month && entry.income > 0).slice(-6);
  const yearMonths = series.filter((entry) => entry.month.startsWith(year));
  const yearToDate = yearMonths.reduce((sum, entry) => sum + entry.income, 0);
  const planned = state.transactions.filter((tx) => tx.type === "income" && tx.date > today);
  const day = Number(today.slice(8));
  const tracked = historyMonths(state.transactions, month);
  return {
    month,
    year,
    series,
    thisMonth,
    soFar: incomeByDay(state, month, day),
    recentMonths: recent.length,
    average: recent.reduce((sum, entry) => sum + entry.income, 0) / Math.max(1, recent.length),
    averageToDate:
      recent.reduce((sum, entry) => sum + incomeByDay(state, entry.month, day), 0) / Math.max(1, recent.length),
    yearToDate,
    monthsSoFar: Math.max(1, Math.min(yearMonths.length, tracked)),
    monthsTracked: Math.max(1, Math.min(12, tracked)),
    best: series.reduce<(typeof series)[number] | null>(
      (best, entry) => (entry.income > 0 && (!best || entry.income > best.income) ? entry : best),
      null,
    ),
    tax: taxPaid(state.transactions, `${year}-01`, month, settings),
    planned: planned.length,
    plannedTotal: planned.reduce((sum, tx) => sum + convert(tx.amount, tx.currency, base, settings.rates), 0),
    plannedThisMonth: planned
      .filter((tx) => monthOf(tx.date) === month)
      .reduce((sum, tx) => sum + incomeInBase(state, tx), 0),
  };
};

// How far the last full months' income strays from their average
export const incomeStability = (series: readonly { month: string; income: number }[], month: string) => {
  const months = series
    .filter((entry) => entry.month < month && entry.income > 0)
    .slice(-6)
    .map((entry) => entry.income);
  if (months.length < 3) return null;
  const mean = months.reduce((sum, value) => sum + value, 0) / months.length;
  const spread = Math.sqrt(months.reduce((sum, value) => sum + (value - mean) ** 2, 0) / months.length);
  return { months: months.length, spread, share: spread / mean };
};

export interface RegularIncome {
  name: string;
  categoryId: string;
  amount: number;
  currency: Currency;
  months: number;
  next: string;
}

// Incomes that came 3+ months running on about the same day, and their next date
export const regularIncomes = (state: AppState, today: string): RegularIncome[] => {
  const since = addMonths(monthOf(today), -6);
  const groups = new Map<string, Transaction[]>();
  for (const tx of state.transactions) {
    if (tx.type !== "income" || tx.date > today || monthOf(tx.date) < since) continue;
    const note = tx.note?.trim().toLocaleLowerCase();
    const key = note === undefined || note === "" ? tx.categoryId : note;
    groups.set(key, [...(groups.get(key) ?? []), tx]);
  }
  return [...groups.values()]
    .flatMap((entries) => {
      const sorted = entries.toSorted((a, b) => a.date.localeCompare(b.date));
      const byMonth = new Map(sorted.map((tx) => [monthOf(tx.date), tx]));
      const last = sorted.at(-1);
      if (!last) return [];
      const day = Number(last.date.slice(8));
      const recent: Transaction[] = [];
      for (let tx = byMonth.get(monthOf(last.date)); tx; tx = byMonth.get(addMonths(monthOf(tx.date), -1))) {
        const like =
          tx.currency === last.currency &&
          Math.abs(tx.amount - last.amount) <= last.amount * 0.15 &&
          Math.abs(Number(tx.date.slice(8)) - day) <= 4;
        if (!like) break;
        recent.push(tx);
      }
      const next = dateInMonth(addMonths(monthOf(last.date), 1), day);
      // An income late by more than a few days no longer counts as regular
      if (recent.length < 3 || daysBetween(next, today) > 4) return [];
      const amount = recent.reduce((sum, tx) => sum + tx.amount, 0) / recent.length;
      const name = last.note?.trim() ?? "";
      const when = next < today ? today : next;
      return [
        { name, categoryId: last.categoryId, amount, currency: last.currency, months: recent.length, next: when },
      ];
    })
    .toSorted((a, b) => a.next.localeCompare(b.next));
};

// How many days apart a planned income may be and still stand for an expected one
const SAME_PAYDAY = 4;

// Regular incomes due again by a date, unless a planned income stands for one
export const expectedIncomes = (state: AppState, today: string, until: string): RegularIncome[] => {
  const planned = state.transactions.filter((tx) => tx.type === "income" && tx.date > today);
  return regularIncomes(state, today).filter(
    (income) =>
      income.next <= until &&
      !planned.some(
        (tx) => Math.abs(daysBetween(tx.date, income.next)) <= SAME_PAYDAY && (tx.note?.trim() ?? "") === income.name,
      ),
  );
};

export interface TaxLimit {
  regime: TaxRegimeId;
  headroom: Headroom;
}

// The share of each used regime's yearly limit taken so far, fullest first
export const taxLimits = (state: AppState, today: string): TaxLimit[] => {
  const yearStart = `${today.slice(0, 4)}-01`;
  const grossByRegime = new Map<TaxRegimeId, number>();
  for (const tx of state.transactions) {
    if (tx.type !== "income" || !tx.tax || tx.date > today || monthOf(tx.date) < yearStart) continue;
    const regime = tx.tax.regime ?? "custom";
    const gross = convert(tx.tax.gross, tx.currency, "UAH", ratesAt(state.settings, tx.date));
    grossByRegime.set(regime, (grossByRegime.get(regime) ?? 0) + gross);
  }
  return [...grossByRegime]
    .flatMap(([regime, gross]) => {
      const headroom = regimeAnnualHeadroom(regime, gross);
      return headroom ? [{ regime, headroom }] : [];
    })
    .toSorted((a, b) => b.headroom.pct - a.headroom.pct);
};

// The last twelve months' income by currency, in it and in the base currency
export const incomeByCurrency = (state: AppState, today: string) => {
  const from = addMonths(monthOf(today), -11);
  return CURRENCIES.map((currency: Currency) => {
    const native = state.transactions
      .filter((tx) => tx.type === "income" && tx.currency === currency && tx.date <= today && monthOf(tx.date) >= from)
      .reduce((sum, tx) => sum + tx.amount, 0);
    return { currency, native, base: convert(native, currency, state.settings.baseCurrency, state.settings.rates) };
  }).filter((entry) => entry.native > 0);
};

// A contract's days, rate, premium, compensations and cut-offs in one line
export const breakdownSummary = (breakdown: IncomeBreakdown, currency: Currency, dayUnit: string): string => {
  const parts = [
    `${String(breakdown.days)}${dayUnit} × ${formatMoney(breakdown.dailyRate, currency, { exact: true })}`,
  ];
  if (breakdown.premium) parts.push(`+${formatMoney(breakdown.premium, currency)}`);
  if (breakdown.compensations) parts.push(`+${formatMoney(breakdown.compensations, currency)}`);
  if (breakdown.cutoffs) parts.push(`−${formatMoney(breakdown.cutoffs, currency)}`);
  return parts.join("  ");
};

export const INCOME_SCOPES = ["received", "planned", "all"] as const;

export type IncomeScope = (typeof INCOME_SCOPES)[number];

// A test of the list's filter: received or planned, a category and a search
export const incomeMatcher = (
  state: AppState,
  today: string,
  scope: IncomeScope,
  categoryId: string,
  query: string,
  texts: (tx: Transaction) => (string | undefined)[],
) => {
  const inCategory = categoryId ? descendantsOf(state.categories, categoryId) : null;
  return (tx: Transaction) => {
    if (scope === "planned" && tx.date <= today) return false;
    if (scope === "received" && tx.date > today) return false;
    if (inCategory && !inCategory.has(tx.categoryId)) return false;
    return matchesQuery(query, ...texts(tx));
  };
};
