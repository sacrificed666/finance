import { counts } from "@/features/data/model/finmath";
import type { AppState, Transaction } from "@/features/data/model/types";
import { expectedIncomes } from "@/features/income/model/income";
import { budgetTotals, yearlyShare } from "@/features/transactions/model/budgets";
import { dateInMonth, daysInMonth, monthOf } from "@/shared/lib/date";
import { convert, ratesAt } from "@/shared/lib/money";

export interface SafeToSpend {
  source: "budgets" | "plan";
  left: number;
  limit: number;
  days: number;
  perDay: number;
  day: number;
  spentByDay: number[];
}

// What went out on each day of a month, in the base currency
export const spentByDay = (state: AppState, month: string): number[] => {
  const { settings } = state;
  const days = Array.from({ length: daysInMonth(month) }, () => 0);
  for (const tx of state.transactions) {
    if (tx.type !== "expense" || !counts(tx) || monthOf(tx.date) !== month) continue;
    const index = Number(tx.date.slice(8)) - 1;
    days[index] =
      (days[index] ?? 0) + convert(tx.amount, tx.currency, settings.baseCurrency, ratesAt(settings, tx.date));
  }
  return days;
};

// The month's income, had, planned and expected, less what went out and bills due
const spendingPlan = (state: AppState, today: string, month: string) => {
  const { settings } = state;
  // An entry's amount in the base currency at the rates of its day
  const inBase = (tx: Transaction) =>
    convert(tx.amount, tx.currency, settings.baseCurrency, ratesAt(settings, tx.date));
  const inMonth = state.transactions.filter((tx) => counts(tx) && monthOf(tx.date) === month);
  // Some entries added up in the base currency
  const sum = (entries: Transaction[]) => entries.reduce((total, tx) => total + inBase(tx), 0);
  const expected = expectedIncomes(state, today, dateInMonth(month, 31)).reduce(
    (total, income) => total + convert(income.amount, income.currency, settings.baseCurrency, settings.rates),
    0,
  );
  const income = sum(inMonth.filter((tx) => tx.type === "income")) + expected;
  const out = sum(inMonth.filter((tx) => tx.type === "expense"));
  return income > 0 ? { limit: income, spent: out } : null;
};

// What a limit leaves to spend, never below nothing
const leftOf = (totals: { limit: number; spent: number }) => Math.max(0, totals.limit - totals.spent);

// What the budgets or the month's income leave per day to go, the tighter one
export const safeToSpend = (state: AppState, today: string): SafeToSpend | null => {
  const month = monthOf(today);
  const share = yearlyShare(state, month);
  const monthly = budgetTotals(state, month);
  const budgets =
    state.budgets.length > 0 ? { limit: monthly.limit + share.limit, spent: monthly.spent + share.spent } : null;
  const plan = spendingPlan(state, today, month);
  const source = budgets && (!plan || leftOf(budgets) <= leftOf(plan)) ? "budgets" : "plan";
  const totals = source === "budgets" ? budgets : plan;
  if (!totals) return null;
  const day = Number(today.slice(8));
  const days = daysInMonth(month) - day + 1;
  const left = leftOf(totals);
  return { source, left, limit: totals.limit, days, perDay: left / days, day, spentByDay: spentByDay(state, month) };
};
