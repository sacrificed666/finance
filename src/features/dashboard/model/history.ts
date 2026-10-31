import { netWorth } from "@/features/data/model/finmath";
import type { AppState, NetWorthSnapshot } from "@/features/data/model/types";
import { addMonths, dateInMonth, monthOf } from "@/shared/lib/date";
import { convert, type Currency } from "@/shared/lib/money";

// A figure kept in hryvnias, in a currency at the snapshot's rates
const fromSnapshot = (value: number, snap: NetWorthSnapshot, currency: Currency): number =>
  currency === "UAH" ? value : value / snap.rates[currency];

// Net worth month by month, today last: the month's last snapshot or a count
export const worthHistory = (state: AppState, today: string, months = 12): number[] => {
  const base = state.settings.baseCurrency;
  const month = monthOf(today);
  const day = Number(today.slice(8));
  const lastSnapshotIn = new Map(state.snapshots.map((snap) => [monthOf(snap.date), snap]));
  return Array.from({ length: months }, (_, index) => {
    if (index === months - 1) return netWorth(state, today).total;
    const past = addMonths(month, index - (months - 1));
    const snap = lastSnapshotIn.get(past);
    return snap ? fromSnapshot(snap.total, snap, base) : netWorth(state, dateInMonth(past, day)).total;
  });
};

// Today's net worth in hryvnias, as the history keeps it
export const todaySnapshot = (state: AppState, today: string): NetWorthSnapshot => {
  const { settings } = state;
  const worth = netWorth(state, today);
  // A figure of the base currency in hryvnias, to the kopiyka
  const uah = (value: number) => Math.round(convert(value, settings.baseCurrency, "UAH", settings.rates) * 100) / 100;
  return {
    date: today,
    total: uah(worth.total),
    savings: uah(worth.savings),
    investments: uah(worth.investments),
    debts: uah(worth.debts),
    receivables: uah(worth.receivables),
    rates: { ...settings.rates },
  };
};

// Whether a new snapshot moved a hryvnia or more from the one kept for its day
export const snapshotMoved = (stored: NetWorthSnapshot | undefined, next: NetWorthSnapshot): boolean =>
  !stored ||
  Math.abs(stored.total - next.total) >= 1 ||
  Math.abs(stored.investments - next.investments) >= 1 ||
  Math.abs(stored.debts - next.debts) >= 1;
