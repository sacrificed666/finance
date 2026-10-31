import { counts } from "@/features/data/model/finmath";
import type { AppState } from "@/features/data/model/types";
import { convert, ratesAt } from "@/shared/lib/money";

export interface Place {
  key: string;
  name: string;
  total: number;
  count: number;
}

// Where a month's money went by the note on each expense, the costliest first
export const topPlaces = (state: AppState, month: string, limit = 6): Place[] => {
  const { settings } = state;
  const places = new Map<string, Place>();
  for (const tx of state.transactions) {
    const name = tx.note?.trim();
    if (tx.type !== "expense" || !counts(tx) || !name || !tx.date.startsWith(month)) continue;
    const key = name.toLocaleLowerCase();
    const amount = convert(tx.amount, tx.currency, settings.baseCurrency, ratesAt(settings, tx.date));
    const place = places.get(key) ?? { key, name, total: 0, count: 0 };
    places.set(key, { ...place, total: place.total + amount, count: place.count + 1 });
  }
  return [...places.values()].toSorted((a, b) => b.total - a.total).slice(0, limit);
};
