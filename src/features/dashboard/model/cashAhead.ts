import { accountBalances } from "@/features/data/model/finmath";
import type { AccountKind, AppState, Transaction } from "@/features/data/model/types";
import { addDays } from "@/shared/lib/date";
import { convert } from "@/shared/lib/money";

// Accounts whose money can be spent right away
const LIQUID = new Set<AccountKind>(["card", "cash", "savings", "wallet", "other"]);

export interface CashPoint {
  date: string;
  value: number;
  change: number;
}

export interface CashAhead {
  start: number;
  points: CashPoint[];
  upcoming: Transaction[];
  changeOn: ReadonlyMap<string, number>;
  lowest: CashPoint;
  firstBelowZero: CashPoint | undefined;
  end: CashPoint;
}

// Planned entries by day, the largest first within a day
const byDateThenSize = (a: Transaction, b: Transaction) => a.date.localeCompare(b.date) || b.amount - a.amount;

// The spendable money day by day until some days ahead, with the planned entries
export const cashAhead = (state: AppState, today: string, days: number): CashAhead => {
  const { baseCurrency, rates } = state.settings;
  const balances = accountBalances(state, today);
  const until = addDays(today, days);
  const start = state.savings
    .filter((account) => LIQUID.has(account.kind))
    .reduce((sum, account) => sum + convert(balances.get(account.id) ?? 0, account.currency, baseCurrency, rates), 0);
  const upcoming = state.transactions
    .filter((tx) => tx.type !== "transfer" && tx.date > today && tx.date <= until)
    .toSorted(byDateThenSize);
  const changeOn = new Map<string, number>();
  for (const tx of upcoming) {
    const amount = convert(tx.amount, tx.currency, baseCurrency, rates);
    changeOn.set(tx.date, (changeOn.get(tx.date) ?? 0) + (tx.type === "income" ? amount : -amount));
  }
  const first: CashPoint = { date: today, value: start, change: 0 };
  const points = [first];
  for (let index = 1; index <= days; index++) {
    const date = addDays(today, index);
    const change = changeOn.get(date) ?? 0;
    points.push({ date, value: (points.at(-1)?.value ?? start) + change, change });
  }
  return {
    start,
    points,
    upcoming,
    changeOn,
    lowest: points.reduce((low, point) => (point.value < low.value ? point : low), first),
    firstBelowZero: points.find((point) => point.value < 0),
    end: points.at(-1) ?? first,
  };
};
