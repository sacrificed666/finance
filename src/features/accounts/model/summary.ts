import { accountBalances, netWorth } from "@/features/data/model/finmath";
import type { AccountKind, AppState, SavingsAccount } from "@/features/data/model/types";
import { addMonths, dateInMonth, monthOf } from "@/shared/lib/date";
import { convert } from "@/shared/lib/money";

// An account's balance today in the base currency
export const balanceInBase = (state: AppState, account: SavingsAccount, balances: ReadonlyMap<string, number>) =>
  convert(balances.get(account.id) ?? 0, account.currency, state.settings.baseCurrency, state.settings.rates);

// The accounts headline: today's worth, the month's change and the money by kind
export const accountsSummary = (state: AppState, today: string) => {
  const { settings } = state;
  const worth = netWorth(state, today);
  const monthAgo = netWorth(state, dateInMonth(addMonths(monthOf(today), -1), Number(today.slice(8))));
  const balances = accountBalances(state, today);
  const byKind = new Map<AccountKind, number>();
  for (const account of state.savings) {
    const value = convert(
      Math.max(0, balances.get(account.id) ?? 0),
      account.currency,
      settings.baseCurrency,
      settings.rates,
    );
    if (value > 0) byKind.set(account.kind, (byKind.get(account.kind) ?? 0) + value);
  }
  return {
    worth,
    monthAgo,
    delta: worth.savings - monthAgo.savings,
    byKind: [...byKind].toSorted((a, b) => b[1] - a[1]),
  };
};

// Each currency's balances, in it and in the base currency, largest first
export const balancesByCurrency = (state: AppState, today: string) => {
  const { settings } = state;
  const balances = accountBalances(state, today);
  const byCurrency = new Map<SavingsAccount["currency"], { base: number; native: number }>();
  for (const account of state.savings) {
    const native = Math.max(0, balances.get(account.id) ?? 0);
    if (native <= 0) continue;
    const row = byCurrency.get(account.currency) ?? { base: 0, native: 0 };
    byCurrency.set(account.currency, {
      base: row.base + convert(native, account.currency, settings.baseCurrency, settings.rates),
      native: row.native + native,
    });
  }
  return [...byCurrency]
    .map(([currency, row]) => ({ currency, base: row.base, native: row.native }))
    .toSorted((a, b) => b.base - a.base);
};
