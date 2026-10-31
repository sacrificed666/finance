import type { Transaction } from "@/features/data/model/types";

// The latest entries up to a day, the last logged first within a day
export const recentEntries = (transactions: readonly Transaction[], today: string, count: number): Transaction[] =>
  transactions
    .map((tx, index) => ({ tx, index }))
    .filter(({ tx }) => tx.date <= today)
    .toSorted((a, b) => b.tx.date.localeCompare(a.tx.date) || b.index - a.index)
    .slice(0, count)
    .map(({ tx }) => tx);
