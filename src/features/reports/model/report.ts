import {
  counts,
  expensesByCategory,
  incomeByCategory,
  monthlySeries,
  rollupToParents,
} from "@/features/data/model/finmath";
import type { AppState, Transaction } from "@/features/data/model/types";
import {
  addDays,
  addMonths,
  dateInMonth,
  daysBetween,
  daysInMonth,
  monthDiff,
  monthOf,
  todayISO,
} from "@/shared/lib/date";
import { convert, ratesAt } from "@/shared/lib/money";

export type ReportPeriod = "month" | "quarter" | "year" | "custom";

export const REPORT_PERIODS: readonly ReportPeriod[] = ["month", "quarter", "year", "custom"];

// What a period is set against: the one before or the one a year earlier
export type ReportCompare = "previous" | "lastYear";

export const REPORT_COMPARES: readonly ReportCompare[] = ["previous", "lastYear"];

// The months in each kind of period with a fixed length
export const PERIOD_MONTHS: Record<Exclude<ReportPeriod, "custom">, number> = { month: 1, quarter: 3, year: 12 };

// The longest range a report covers, ten years of months
export const MAX_RANGE_MONTHS = 120;

export interface MonthRange {
  from: string;
  to: string;
}

// A chosen range in order, cut to its last ten years
export const orderedRange = ({ from, to }: MonthRange): MonthRange => {
  const [first, last] = from <= to ? [from, to] : [to, from];
  return monthDiff(first, last) < MAX_RANGE_MONTHS
    ? { from: first, to: last }
    : { from: addMonths(last, 1 - MAX_RANGE_MONTHS), to: last };
};

// The first month of the period a month falls in; a range starts where it is set
export const periodStart = (period: ReportPeriod, month: string): string => {
  const year = month.slice(0, 4);
  if (period === "year") return `${year}-01`;
  if (period === "quarter") {
    const first = Math.floor((Number(month.slice(5, 7)) - 1) / 3) * 3 + 1;
    return `${year}-${String(first).padStart(2, "0")}`;
  }
  return month;
};

// A period as a key: the month, "2026-Q2", the year or "2026-01_2026-06"
export const periodKey = (period: ReportPeriod, start: string, end = start): string => {
  if (period === "custom") return start === end ? start : `${start}_${end}`;
  if (period === "year") return start.slice(0, 4);
  if (period === "quarter")
    return `${start.slice(0, 4)}-Q${String(Math.floor((Number(start.slice(5, 7)) - 1) / 3) + 1)}`;
  return start;
};

export interface PeriodTotals {
  income: number;
  expense: number;
  net: number;
  byCategory: Map<string, number>;
  bySource: Map<string, number>;
  byTag: Map<string, number>;
  byAccount: Map<string, number>;
  fixed: number;
  months: string[];
}

// Whether an entry was posted by a recurring rule or a subscription
const isFixed = (tx: Transaction) => (tx.recurringId ?? tx.subscriptionId) !== undefined;

// A period's income by source, spending by category, tag and account, fixed part
const periodTotals = (state: AppState, from: string, length: number): PeriodTotals => {
  const { settings } = state;
  const months = Array.from({ length }, (_, index) => addMonths(from, index));
  const inside = new Set(months);
  const series = monthlySeries(state.transactions, addMonths(from, length - 1), length, settings);
  const byCategory = new Map<string, number>();
  for (const month of months) {
    for (const [id, value] of rollupToParents(
      expensesByCategory(state.transactions, month, settings),
      state.categories,
    )) {
      byCategory.set(id, (byCategory.get(id) ?? 0) + value);
    }
  }
  const byTag = new Map<string, number>();
  const byAccount = new Map<string, number>();
  let fixed = 0;
  for (const tx of state.transactions) {
    if (tx.type !== "expense" || !counts(tx) || !inside.has(monthOf(tx.date))) continue;
    const amount = convert(tx.amount, tx.currency, settings.baseCurrency, ratesAt(settings, tx.date));
    if (isFixed(tx)) fixed += amount;
    for (const tag of tx.tags ?? []) byTag.set(tag, (byTag.get(tag) ?? 0) + amount);
    const account = tx.accountId ?? "";
    byAccount.set(account, (byAccount.get(account) ?? 0) + amount);
  }
  const bySource = rollupToParents(
    incomeByCategory(state.transactions, from, addMonths(from, length - 1), settings),
    state.categories,
  );
  const income = series.reduce((sum, entry) => sum + entry.income, 0);
  const expense = series.reduce((sum, entry) => sum + entry.expense, 0);
  return { income, expense, net: income - expense, byCategory, bySource, byTag, byAccount, fixed, months };
};

// The state with only the entries up to a date
const upTo = (state: AppState, date: string): AppState => ({
  ...state,
  transactions: state.transactions.filter((tx) => tx.date <= date),
});

// The day as far into the period before as today is into its own
export const sameDayBefore = (start: string, prevStart: string, today: string): string => {
  const date = addDays(`${prevStart}-01`, daysBetween(`${start}-01`, today));
  const last = dateInMonth(addMonths(start, -1), 31);
  return date < last ? date : last;
};

export interface ReportOptions {
  compare?: ReportCompare;
  range?: MonthRange;
}

// A period beside another; a running one counts to today on both sides
export const report = (
  state: AppState,
  period: ReportPeriod,
  anchor: string,
  today = todayISO(),
  { compare = "previous", range }: ReportOptions = {},
) => {
  const { settings } = state;
  const span = period === "custom" ? orderedRange(range ?? { from: anchor, to: anchor }) : null;
  const start = span ? span.from : periodStart(period, anchor);
  const length = span ? monthDiff(span.from, span.to) + 1 : PERIOD_MONTHS[period === "custom" ? "month" : period];
  const end = addMonths(start, length - 1);
  const prevStart = compare === "lastYear" ? addMonths(start, -12) : addMonths(start, -length);
  const prevEnd = addMonths(prevStart, length - 1);
  const inProgress = monthDiff(start, monthOf(today)) >= 0 && monthDiff(monthOf(today), end) >= 0;
  const now = inProgress ? upTo(state, today) : state;
  const then = inProgress ? upTo(state, sameDayBefore(start, prevStart, today)) : state;
  // Whether an entry falls in the period
  const inPeriod = (tx: Transaction) =>
    monthDiff(start, monthOf(tx.date)) >= 0 && monthDiff(monthOf(tx.date), end) >= 0;
  // The months before the period's end, a running one only up to today
  const year = monthlySeries(now.transactions, end, 12, settings);
  return {
    start,
    end,
    prevStart,
    prevEnd,
    compare,
    inProgress,
    current: periodTotals(now, start, length),
    previous: periodTotals(then, prevStart, length),
    largest: now.transactions
      .filter((tx) => tx.type === "expense" && counts(tx) && inPeriod(tx))
      .map((tx) => ({ tx, base: convert(tx.amount, tx.currency, settings.baseCurrency, ratesAt(settings, tx.date)) }))
      .toSorted((a, b) => b.base - a.base)
      .slice(0, 5),
    year,
    // A category's spending month by month over the year to the period's end
    trendOf: (categoryId: string) =>
      year.map(
        (entry) =>
          rollupToParents(expensesByCategory(now.transactions, entry.month, settings), state.categories).get(
            categoryId,
          ) ?? 0,
      ),
  };
};

export type Report = ReturnType<typeof report>;

export interface CategoryChange {
  id: string;
  value: number;
  before: number;
}

// Every category spent on in either period, the largest now first
export const categoryChanges = (r: Report): CategoryChange[] => {
  const now = [...r.current.byCategory].map(([id, value]) => ({
    id,
    value,
    before: r.previous.byCategory.get(id) ?? 0,
  }));
  const gone = [...r.previous.byCategory]
    .filter(([id]) => !r.current.byCategory.has(id))
    .map(([id, before]) => ({ id, value: 0, before }));
  return [...now, ...gone].toSorted((a, b) => b.value - a.value);
};

// The days of a period and how many of them have passed by today
export const periodDays = (months: readonly string[], today: string): { days: number; elapsed: number } => {
  const current = monthOf(today);
  return {
    days: months.reduce((sum, month) => sum + daysInMonth(month), 0),
    elapsed: months.reduce((sum, month) => {
      if (month === current) return sum + Number(today.slice(8));
      return sum + (month < current ? daysInMonth(month) : 0);
    }, 0),
  };
};

// The share of income kept, in percent
export const keptRate = (income: number, net: number): number => (income > 0 ? (net / income) * 100 : 0);

// The months of the year with money moving, the best and worst of them
export const yearReview = (year: Report["year"]) => {
  const active = year.filter((entry) => entry.income > 0 || entry.expense > 0);
  const [first, ...rest] = active;
  if (!first) return null;
  return {
    best: rest.reduce((best, entry) => (entry.net > best.net ? entry : best), first),
    worst: rest.reduce((worst, entry) => (entry.net < worst.net ? entry : worst), first),
    months: active.length,
    inThePlus: active.filter((entry) => entry.net > 0).length,
  };
};
