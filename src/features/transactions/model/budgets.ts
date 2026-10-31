import { monthTotals } from "@/features/data/model/finmath";
import type { AppState, Budget } from "@/features/data/model/types";
import { budgetLimit, movedIn, spentInBudget } from "@/features/transactions/model/categories";
import { addDays, addMonths, dateInMonth, daysBetween, daysInMonth, monthOf } from "@/shared/lib/date";
import { convert, type Currency } from "@/shared/lib/money";

export interface BudgetTotals {
  limit: number;
  spent: number;
  over: number;
}

// Whether a budget's limit is for a whole calendar year
export const isYearly = (budget: Budget): boolean => budget.period === "yearly";

// The budgets with a limit for each month
export const monthlyBudgets = (state: AppState): Budget[] => state.budgets.filter((budget) => !isYearly(budget));

// Whether a budget's category sits under one with a budget the test accepts
const insideAnother = (state: AppState, budget: Budget, counts: (other: Budget) => boolean = () => true): boolean => {
  const parentId = state.categories.find((category) => category.id === budget.categoryId)?.parentId;
  return parentId !== undefined && state.budgets.some((other) => other.categoryId === parentId && counts(other));
};

// What a budget's categories spent: in the month, or in its year up to the month
export const budgetSpent = (state: AppState, budget: Budget, month: string): number => {
  if (!isYearly(budget)) return spentInBudget(state, budget.categoryId, budget.currency, month);
  const january = `${month.slice(0, 4)}-01`;
  let spent = 0;
  for (let at = january; at <= month; at = addMonths(at, 1)) {
    spent += spentInBudget(state, budget.categoryId, budget.currency, at);
  }
  return spent;
};

// The monthly budgets' limits and spending in the base currency, and those over
export const budgetTotals = (state: AppState, month: string): BudgetTotals => {
  const { settings } = state;
  const base = settings.baseCurrency;
  return monthlyBudgets(state).reduce<BudgetTotals>(
    (totals, budget) => {
      const limit = budgetLimit(state, budget, month);
      const spent = spentInBudget(state, budget.categoryId, budget.currency, month);
      const over = totals.over + (spent > limit ? 1 : 0);
      // A parent's budget already holds what its subcategories spend
      const counted = !insideAnother(state, budget, (other) => !isYearly(other));
      return {
        limit: totals.limit + (counted ? convert(limit, budget.currency, base, settings.rates) : 0),
        spent: totals.spent + (counted ? convert(spent, budget.currency, base, settings.rates) : 0),
        over,
      };
    },
    { limit: 0, spent: 0, over: 0 },
  );
};

// This month's part of the yearly budgets: their rest over the months to go
export const yearlyShare = (state: AppState, month: string): { limit: number; spent: number } => {
  const { settings } = state;
  const monthsLeft = 13 - Number(month.slice(5, 7));
  return state.budgets
    .filter((budget) => isYearly(budget) && !insideAnother(state, budget))
    .reduce(
      (totals, budget) => {
        const before = month.endsWith("-01") ? 0 : budgetSpent(state, budget, addMonths(month, -1));
        const now = spentInBudget(state, budget.categoryId, budget.currency, month);
        // An amount of the budget in the base currency
        const inBase = (amount: number) => convert(amount, budget.currency, settings.baseCurrency, settings.rates);
        return {
          limit: totals.limit + inBase(Math.max(0, budget.limit - before) / monthsLeft),
          spent: totals.spent + inBase(now),
        };
      },
      { limit: 0, spent: 0 },
    );
};

// The month's spending no budget of either period covers, in the base currency
export const unbudgetedSpending = (state: AppState, month: string) => {
  const { settings } = state;
  const covered = state.budgets
    .filter((budget) => !insideAnother(state, budget))
    .reduce(
      (sum, budget) =>
        sum +
        convert(
          spentInBudget(state, budget.categoryId, budget.currency, month),
          budget.currency,
          settings.baseCurrency,
          settings.rates,
        ),
      0,
    );
  return monthTotals(state.transactions, month, settings).expense - covered;
};

// The day a budget runs out at this pace in its month or year, or null
export const runsOutOn = (
  spent: number,
  limit: number,
  month: string,
  today: string,
  yearly = false,
): string | null => {
  if (spent <= 0 || spent >= limit) return null;
  if (yearly) {
    const start = `${month.slice(0, 4)}-01-01`;
    if (month !== monthOf(today)) return null;
    const elapsed = daysBetween(start, today) + 1;
    if (elapsed < 14) return null;
    const day = Math.floor((limit / spent) * elapsed);
    return day < daysBetween(start, `${String(Number(month.slice(0, 4)) + 1)}-01-01`) ? addDays(start, day) : null;
  }
  const elapsed = month === monthOf(today) ? Number(today.slice(8)) : 0;
  if (elapsed < 3) return null;
  const day = Math.floor((limit / spent) * elapsed);
  return day < daysInMonth(month) ? dateInMonth(month, day + 1) : null;
};

// A budget's limit with carried rest and moves, its spending and share used
export const budgetProgress = (state: AppState, budget: Budget, month: string) => {
  const limit = budgetLimit(state, budget, month);
  const spent = budgetSpent(state, budget, month);
  const moved = movedIn(budget, month);
  return { limit, spent, moved, carried: limit - budget.limit - moved, share: limit > 0 ? spent / limit : 0 };
};

// How many full months the suggested limit looks back on
const SUGGEST_MONTHS = 3;

// A limit from what the category spent: a month's average or the last year's
export const suggestedLimit = (
  state: AppState,
  categoryId: string,
  currency: Currency,
  month: string,
  yearly: boolean,
): number => {
  const months = yearly ? 12 : SUGGEST_MONTHS;
  let spent = 0;
  for (let back = 1; back <= months; back++) {
    spent += spentInBudget(state, categoryId, currency, addMonths(month, -back));
  }
  const limit = yearly ? spent : spent / months;
  return limit >= 100 ? Math.ceil(limit / 100) * 100 : Math.ceil(limit);
};

// The budget with an amount moved in or out in a month, empty moves dropped
const withMove = (budget: Budget, month: string, amount: number): Budget => {
  const value = Math.round((movedIn(budget, month) + amount) * 100) / 100;
  const moved = { ...budget.moved };
  if (Math.abs(value) < 0.005) delete moved[month];
  else moved[month] = value;
  const { moved: _was, ...rest } = budget;
  return Object.keys(moved).length > 0 ? { ...rest, moved } : rest;
};

// The budgets with part of one's month moved into another, in that one's currency
export const moveBetweenBudgets = (
  state: AppState,
  fromId: string,
  toId: string,
  month: string,
  amount: number,
): AppState => {
  const from = state.budgets.find((budget) => budget.categoryId === fromId);
  const to = state.budgets.find((budget) => budget.categoryId === toId);
  if (!from || !to || fromId === toId || !(amount > 0)) return state;
  const arriving = convert(amount, from.currency, to.currency, state.settings.rates);
  return {
    ...state,
    budgets: state.budgets.map((budget) => {
      if (budget === from) return withMove(budget, month, -amount);
      if (budget === to) return withMove(budget, month, arriving);
      return budget;
    }),
  };
};

// Whether a category is left without a budget, so a new one can be added
export const canAddBudget = (state: AppState) => {
  const budgeted = new Set(state.budgets.map((budget) => budget.categoryId));
  return state.categories.some((entry) => entry.kind === "expense" && !budgeted.has(entry.id));
};

// The budgets with one saved; moving one replaces the budget of its category
export const saveBudget = (state: AppState, budget: Budget, editingId: string | null): AppState => ({
  ...state,
  budgets: [
    ...state.budgets.filter((entry) => entry.categoryId !== editingId && entry.categoryId !== budget.categoryId),
    budget,
  ],
});

// The budgets without the one of a category
export const deleteBudget = (state: AppState, categoryId: string): AppState => ({
  ...state,
  budgets: state.budgets.filter((entry) => entry.categoryId !== categoryId),
});
