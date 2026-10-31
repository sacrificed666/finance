import { CORE_CURRENCIES, CURRENCIES, type Currency } from "@/shared/lib/money";

import type { AppState } from "./types";

// The currencies tables show: the core ones and any the account's records use
export const displayCurrencies = (state: AppState): Currency[] => {
  const used = new Set<Currency>([state.settings.baseCurrency]);
  for (const account of state.savings) used.add(account.currency);
  for (const investment of state.investments) used.add(investment.currency);
  for (const debt of state.debts) used.add(debt.currency);
  for (const subscription of state.subscriptions) used.add(subscription.currency);
  for (const rule of state.recurring) used.add(rule.currency);
  for (const entry of state.transactions) used.add(entry.currency);
  return CURRENCIES.filter((currency) => CORE_CURRENCIES.includes(currency) || used.has(currency));
};
