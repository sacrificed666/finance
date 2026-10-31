import { monthDiff } from "@/shared/lib/date";
import { convert, parseAmount, type Currency } from "@/shared/lib/money";

import type { Forecast } from "./forecast";

// A positive amount typed in a field, or zero
export const positiveAmount = (input: string): number => {
  const value = parseAmount(input);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

export interface GoalPlan {
  reached: boolean;
  hitIndex: number;
  hitMonth: string | null;
  months: number;
  neededMonthly: number | null;
}

// When the money reaches a goal, and what a month must add to reach it by a date
export const goalPlan = (f: Forecast, goal: number, by: string, returnPct: number): GoalPlan => {
  const reached = goal > 0 && f.assetsNow >= goal;
  const hitIndex = goal > 0 ? f.projection.findIndex((point) => point.net >= goal) : -1;
  const months = Math.max(1, monthDiff(f.startMonth, by));
  let neededMonthly: number | null = null;
  if (goal > 0 && !reached) {
    const gap = goal - (f.projection[Math.min(months, f.projection.length - 1)]?.net ?? 0);
    const rate = returnPct / 100 / 12;
    const factor = rate === 0 ? months : (Math.pow(1 + rate, months) - 1) / rate;
    neededMonthly = gap > 0 ? gap / Math.max(1, factor) : 0;
  }
  return {
    reached,
    hitIndex,
    hitMonth: hitIndex >= 0 ? (f.projection[hitIndex]?.month ?? null) : null,
    months,
    neededMonthly,
  };
};

// Round goals of two, five and ten times the scale of the money held now
export const goalPresets = (f: Forecast, currency: Currency): number[] => {
  const anchor = Math.max(convert(f.assetsNow, f.base, currency, f.state.settings.rates), 1);
  const step = 10 ** Math.floor(Math.log10(anchor));
  return [2, 5, 10].map((times) => Math.round(times * step));
};

// Up to three round amounts the money passes, and the months it passes them
export const milestones = (f: Forecast): { amount: number; month: string }[] => {
  const top = f.endPoint.net;
  if (top <= f.assetsNow) return [];
  const step = 10 ** Math.floor(Math.log10(Math.max(top, 1)));
  const found: { amount: number; month: string }[] = [];
  for (let target = step; target <= top && found.length < 3; target += step) {
    const month = target > f.assetsNow ? f.projection.find((point) => point.net >= target)?.month : undefined;
    if (month) found.push({ amount: convert(target, f.base, f.view, f.state.settings.rates), month });
  }
  return found;
};
