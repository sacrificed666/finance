import { currencyAllocation, netWorthByKind } from "@/features/data/model/finmath";
import type { AppState } from "@/features/data/model/types";
import { addMonths, dateInMonth, monthOf } from "@/shared/lib/date";
import { CURRENCY_SLOT } from "@/shared/lib/money";

export type AllocationBy = "kind" | "currency";

export interface AllocationPart {
  id: string;
  icon?: string;
  slot: number;
  base: number;
}

export interface AllocationMonth {
  month: string;
  total: number;
  parts: AllocationPart[];
}

// What the assets were made of at a day, by kind or by currency
const partsAt = (state: AppState, day: string, by: AllocationBy): AllocationPart[] =>
  by === "kind"
    ? netWorthByKind(state, day).map((row) => ({ id: row.id, icon: row.icon, slot: row.colorSlot, base: row.base }))
    : currencyAllocation(state, day)
        .filter((row) => row.base > 0)
        .map((row) => ({ id: row.currency, slot: CURRENCY_SLOT[row.currency], base: row.base }));

// The assets at the end of each of the last months, this one up to today
export const allocationHistory = (
  state: AppState,
  today: string,
  months: number,
  by: AllocationBy,
): AllocationMonth[] => {
  const current = monthOf(today);
  return Array.from({ length: months }, (_, index) => addMonths(current, index - months + 1)).map((month) => {
    const parts = partsAt(state, month === current ? today : dateInMonth(month, 31), by);
    return { month, total: parts.reduce((sum, part) => sum + part.base, 0), parts };
  });
};

// Every part that shows in any month, in the order of the latest month's size
export const allocationSeries = (history: readonly AllocationMonth[]): AllocationPart[] => {
  const seen = new Map<string, AllocationPart>();
  for (const month of history.toReversed()) {
    for (const part of month.parts.toSorted((a, b) => b.base - a.base)) {
      if (!seen.has(part.id)) seen.set(part.id, part);
    }
  }
  return [...seen.values()];
};
