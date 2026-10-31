import { counts, monthlySeries, monthTotals } from "@/features/data/model/finmath";
import type { AppState } from "@/features/data/model/types";
import { budgetTotals } from "@/features/transactions/model/budgets";
import { addMonths, dateInMonth, daysInMonth, monthOf } from "@/shared/lib/date";
import { convert, ratesAt } from "@/shared/lib/money";

// The base-currency total of a month's entries of a type still to come
export const plannedAmount = (state: AppState, month: string, today: string, type: "income" | "expense") => {
  const { settings } = state;
  return state.transactions
    .filter((tx) => tx.type === type && monthOf(tx.date) === month && tx.date > today)
    .reduce((sum, tx) => sum + convert(tx.amount, tx.currency, settings.baseCurrency, ratesAt(settings, tx.date)), 0);
};

// A month's totals from its entries up to a day only
const totalsUpTo = (state: AppState, month: string, date: string) =>
  monthTotals(
    state.transactions.filter((tx) => tx.date <= date),
    month,
    state.settings,
  );

// What a month's bills booked by a schedule cost up to a day
const scheduledPaid = (state: AppState, month: string, today: string): number => {
  const { settings } = state;
  return state.transactions
    .filter((tx) => tx.type === "expense" && counts(tx) && monthOf(tx.date) === month && tx.date <= today)
    .filter((tx) => tx.recurringId !== undefined || tx.subscriptionId !== undefined)
    .reduce((sum, tx) => sum + convert(tx.amount, tx.currency, settings.baseCurrency, ratesAt(settings, tx.date)), 0);
};

// A month's figures beside the one before, up to the same day while it runs
export const monthSummary = (state: AppState, month: string, today: string) => {
  const { settings } = state;
  const previousMonth = addMonths(month, -1);
  const totals = monthTotals(state.transactions, month, settings);
  const previous = monthTotals(state.transactions, previousMonth, settings);
  const year = monthlySeries(state.transactions, month, 12, settings);
  const spendingMonths = year.filter((entry) => entry.expense > 0);
  const isCurrent = month === monthOf(today);
  const plannedIncome = plannedAmount(state, month, today, "income");
  const plannedExpense = plannedAmount(state, month, today, "expense");
  const elapsed = isCurrent ? Number(today.slice(8)) : daysInMonth(month);
  const soFar = isCurrent ? totalsUpTo(state, month, today) : totals;
  const previousSoFar = isCurrent ? totalsUpTo(state, previousMonth, dateInMonth(previousMonth, elapsed)) : previous;
  const paidBills = scheduledPaid(state, month, today);
  const everyday = Math.max(0, soFar.expense - paidBills);
  return {
    totals,
    previous,
    soFar,
    previousSoFar,
    hasPrevious: previous.income > 0 || previous.expense > 0,
    year,
    spendingMonths: spendingMonths.length,
    averageSpend: spendingMonths.reduce((sum, entry) => sum + entry.expense, 0) / Math.max(1, spendingMonths.length),
    plannedIncome,
    plannedExpense,
    isCurrent,
    spentSoFar: soFar.expense,
    perDay: soFar.expense / elapsed,
    previousPerDay: isCurrent ? previousSoFar.expense / elapsed : previous.expense / daysInMonth(previousMonth),
    projected: (everyday / elapsed) * daysInMonth(month) + paidBills + (totals.expense - soFar.expense),
    expenseCount: state.transactions.filter((tx) => tx.type === "expense" && monthOf(tx.date) === month).length,
    budget: budgetTotals(state, month),
  };
};
