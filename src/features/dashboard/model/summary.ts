import { holdings, type Holding, type monthlySeries } from "@/features/data/model/finmath";
import type { AppState } from "@/features/data/model/types";

export type MonthFigures = ReturnType<typeof monthlySeries>[number];

// The share of a month's income that was kept, in percent
export const savingsRate = (entry: { income: number; net: number }): number =>
  entry.income > 0 ? (entry.net / entry.income) * 100 : 0;

// Whether there is anything at all for the dashboard to show
export const hasAnyData = (state: AppState): boolean =>
  state.transactions.length > 0 || state.savings.length > 0 || state.investments.length > 0 || state.debts.length > 0;

// The average spending of the months that had any
export const averageSpending = (series: readonly MonthFigures[]): number => {
  const spending = series.filter((entry) => entry.expense > 0);
  return spending.length > 0 ? spending.reduce((sum, entry) => sum + entry.expense, 0) / spending.length : 0;
};

// Holdings worth something, the largest first, each in its colour
export const holdingRows = (state: AppState, today: string): { holding: Holding; colorSlot: number }[] =>
  holdings(state, today)
    .map((holding, index) => ({ holding, colorSlot: (index % 13) + 1 }))
    .filter((row) => row.holding.base > 0)
    .toSorted((a, b) => b.holding.base - a.holding.base);
