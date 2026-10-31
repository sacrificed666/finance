import type { AppState, Transaction } from "@/features/data/model/types";
import { addDays } from "@/shared/lib/date";
import type { Currency } from "@/shared/lib/money";

export interface FrequentEntry {
  key: string;
  categoryId: string;
  note: string;
  accountId: string;
  currency: Currency;
  amount: number | null;
  count: number;
}

// How far back an entry counts and how often it must have come up to be offered
const LOOKBACK_DAYS = 90;
const MIN_COUNT = 2;

// Entries typed by hand, not posted by a schedule, split from another or taxed
const isTyped = (tx: Transaction) =>
  tx.recurringId === undefined && tx.subscriptionId === undefined && tx.splitId === undefined && !tx.tax;

// The entries of a kind typed most often lately, with their amount when it repeats
export const frequentEntries = (
  state: AppState,
  type: "expense" | "income",
  today: string,
  limit = 6,
): FrequentEntry[] => {
  const since = addDays(today, -LOOKBACK_DAYS);
  const known = new Set(state.categories.map((entry) => entry.id));
  const groups = new Map<string, Transaction[]>();
  for (const tx of state.transactions) {
    if (tx.type !== type || tx.date > today || tx.date < since || !isTyped(tx) || !known.has(tx.categoryId)) continue;
    const key = `${tx.categoryId}|${tx.note?.trim().toLocaleLowerCase() ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), tx]);
  }
  return [...groups]
    .filter(([, entries]) => entries.length >= MIN_COUNT)
    .flatMap(([key, entries]) => {
      const [last, before] = entries.toSorted((a, b) => b.date.localeCompare(a.date));
      if (!last) return [];
      const repeats = before !== undefined && before.amount === last.amount && before.currency === last.currency;
      return [
        {
          key,
          categoryId: last.categoryId,
          note: last.note?.trim() ?? "",
          accountId: last.accountId ?? "",
          currency: last.currency,
          amount: repeats ? last.amount : null,
          count: entries.length,
          latest: last.date,
        },
      ];
    })
    .toSorted((a, b) => b.count - a.count || b.latest.localeCompare(a.latest))
    .slice(0, limit)
    .map(({ latest: _latest, ...entry }) => entry);
};
