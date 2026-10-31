import { subscriptionBillsIn, subscriptionChargesIn, subscriptionsMonthlyTotal } from "@/features/data/model/finmath";
import { nextBooking, perMonth } from "@/features/data/model/frequency";
import type { AppState, Subscription } from "@/features/data/model/types";
import { convert } from "@/shared/lib/money";

import { averageSpending, type MonthFigures } from "./summary";

// What a subscription costs a month, on average over its year
export const monthlyPrice = (sub: Subscription): number => perMonth(sub.price, sub.period);

// The next day a subscription charges from today, or null when it ends first
export const nextCharge = (sub: Subscription, today: string): string | null => nextBooking(sub, today);

export interface SubscriptionsDue {
  billed: Subscription[];
  charging: number;
  total: number;
  top: Subscription[];
  share: number;
}

// This month's subscriptions, their total, the dearest and share of spending
export const subscriptionsDue = (
  state: AppState,
  month: string,
  series: readonly MonthFigures[],
  shown: number,
): SubscriptionsDue => {
  const { settings } = state;
  const base = settings.baseCurrency;
  const billed = state.subscriptions.filter((sub) => subscriptionBillsIn(sub, month));
  const total = subscriptionsMonthlyTotal(billed, base, settings);
  // A subscription's monthly price in the base currency
  const inBase = (sub: Subscription) => convert(monthlyPrice(sub), sub.currency, base, settings.rates);
  const average = averageSpending(series);
  return {
    billed,
    charging: billed.filter((sub) => subscriptionChargesIn(sub, month)).length,
    total,
    top: billed.toSorted((a, b) => inBase(b) - inBase(a)).slice(0, shown),
    share: average > 0 ? (total / average) * 100 : 0,
  };
};
