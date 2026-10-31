import type { Transaction } from "@/features/data/model/types";
import { addMonths, monthDiff, monthOf } from "@/shared/lib/date";

// The fewest months the activity picture draws
const SHORTEST = 6;

// The longest stretch it draws
const LONGEST = 12;

// Entries logged each month since the first one, a year at most, and their pace
export const entryActivity = (transactions: Transaction[], month: string) => {
  const first = transactions.reduce<string | null>((min, tx) => (!min || tx.date < min ? tx.date : min), null);
  const history = first ? monthDiff(monthOf(first), month) + 1 : 0;
  const span = Math.min(LONGEST, Math.max(history, SHORTEST));
  const counts = new Map<string, number>();
  for (let back = span - 1; back >= 0; back--) counts.set(addMonths(month, -back), 0);
  for (const tx of transactions) {
    const key = monthOf(tx.date);
    const count = counts.get(key);
    if (count !== undefined) counts.set(key, count + 1);
  }
  const values = [...counts.values()];
  const logged = values.reduce((sum, count) => sum + count, 0);
  return {
    first,
    from: addMonths(month, 1 - span),
    values,
    average: logged / Math.max(1, Math.min(history, span)),
  };
};
