"use client";

import { useStore } from "@/app/hooks";
import { monthlySeries, monthTotals } from "@/features/data/model/finmath";
import { monthOf, todayISO } from "@/shared/lib/date";

import type { MonthFigures } from "./summary";

// This month and the eleven before it, and this month up to today
export const useMonthSummary = () => {
  const { state } = useStore();
  const base = state.settings.baseCurrency;
  const today = todayISO();
  const month = monthOf(today);
  const series = monthlySeries(state.transactions, month, 12, state.settings);
  const current = series.at(-1) ?? { month, income: 0, expense: 0, net: 0 };
  const recorded = state.transactions.filter((tx) => tx.date <= today);
  const soFar: MonthFigures = { month, ...monthTotals(recorded, month, state.settings) };
  return { state, base, month, today, series, current, soFar };
};
