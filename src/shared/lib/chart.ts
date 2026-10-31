import type { ReactNode } from "react";

import { areAmountsHidden, hiddenFigure } from "@/shared/lib/money";

export type Tone = "income" | "expense" | "accent";

// The colour of each tone a chart can take
export const TONE_COLOR: Record<Tone, string> = {
  income: "var(--color-income)",
  expense: "var(--color-expense)",
  accent: "var(--color-accent)",
};

// How many series colours the palette has
const SERIES_COUNT = 14;

// The custom property of a series colour, wrapping past the last one
export const seriesColor = (slot: number): string => `var(--series-${String(((slot - 1) % SERIES_COUNT) + 1)})`;

// Round axis steps from zero to the maximum: 1, 2, 2.5 or 5 times a power of 10
export const niceTicks = (max: number, count = 4): number[] => {
  if (max <= 0) return [0, 1];
  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((multiple) => multiple * magnitude).find((value) => value >= rough) ?? rough;
  const ticks: number[] = [];
  for (let value = 0; value <= max + step * 0.001; value += step) ticks.push(value);
  const top = ticks.at(-1) ?? 0;
  if (top < max) ticks.push(top + step);
  return ticks;
};

// Round axis steps around a range that never crosses zero, a margin on each side
export const niceRange = (low: number, high: number, count = 3): number[] => {
  const margin = Math.max((high - low) * 0.25, Math.abs(high) * 0.02, 1);
  const from = Math.max(0, low - margin);
  const to = high + margin;
  const rough = (to - from) / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((multiple) => multiple * magnitude).find((value) => value >= rough) ?? rough;
  const ticks: number[] = [];
  for (let value = Math.floor(from / step) * step; value < to + step; value += step) ticks.push(value);
  return ticks;
};

// Axis labels in thousands or millions when the top value is that large
export const axisFormatter = (top: number): ((value: number) => string) => {
  let divisor = 1;
  let suffix = "";
  if (top >= 1_000_000) {
    divisor = 1_000_000;
    suffix = "M";
  } else if (top >= 1000) {
    divisor = 1000;
    suffix = "K";
  }
  return (value) => {
    if (value === 0) return "0";
    if (areAmountsHidden()) return hiddenFigure();
    const scaled = value / divisor;
    const text = Math.abs(scaled) < 10 && !Number.isInteger(scaled) ? scaled.toFixed(1) : String(Math.round(scaled));
    return text + suffix;
  };
};

// The periods a chart can show, with the key of their short label
export const CHART_PERIODS = [
  { months: 6, label: "period.6m" },
  { months: 12, label: "period.1y" },
  { months: 24, label: "period.2y" },
  { months: 36, label: "period.3y" },
] as const;

// The fewest months a monthly chart draws, however short the history
const SHORTEST = CHART_PERIODS[0].months;

// The periods a history of so many months fills, the chosen one and its months
export const chartSpan = (history: number, chosen: number) => {
  const periods = CHART_PERIODS.filter((_, index) => index === 0 || (CHART_PERIODS[index - 1]?.months ?? 0) < history);
  const value = Math.min(chosen, periods.at(-1)?.months ?? SHORTEST);
  return { periods, value, months: Math.min(value, Math.max(history, SHORTEST)) };
};

// Where a monthly trend starts once its flat lead-in is cut, its last month kept
export const trendStart = (values: readonly number[], fewest = SHORTEST): number => {
  const moved = values.findIndex((value) => value !== values[0]);
  return Math.max(0, Math.min(moved > 0 ? moved - 1 : 0, values.length - fewest));
};

// Where a monthly flow starts: its first month with money, two points at least
export const flowStart = (values: readonly number[]): number => {
  const first = values.findIndex((value) => value !== 0);
  const latest = Math.max(0, values.length - 2);
  return first < 0 ? latest : Math.min(first, latest);
};

// One part of a whole, for split bars, rings and breakdown lists
export interface BreakdownSegment {
  id: string;
  label: string;
  icon?: ReactNode;
  value: number;
  colorSlot: number;
}
