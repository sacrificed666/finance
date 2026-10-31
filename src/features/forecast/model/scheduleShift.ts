import { monthlySeries } from "@/features/data/model/finmath";
import { bookingsInMonth } from "@/features/data/model/frequency";
import type { AppState } from "@/features/data/model/types";
import { addMonths } from "@/shared/lib/date";
import { convert } from "@/shared/lib/money";

// The months the average of what is kept looks back on
const PAST_MONTHS = 6;

// What the recurring rules and subscriptions book in a month, income less spending
export const scheduledNet = (state: AppState, month: string): number => {
  const { baseCurrency, rates } = state.settings;
  let net = 0;
  for (const rule of state.recurring) {
    const times = bookingsInMonth(rule, month);
    if (times === 0) continue;
    const amount = convert(rule.amount * times, rule.currency, baseCurrency, rates);
    net += rule.type === "income" ? amount : -amount;
  }
  for (const subscription of state.subscriptions) {
    if (!subscription.active) continue;
    const times = bookingsInMonth(subscription, month);
    net -= convert(subscription.price * times, subscription.currency, baseCurrency, rates);
  }
  return net;
};

// How much each month ahead the schedules move what is kept from its past average
export const scheduleShift = (state: AppState, startMonth: string): ((month: string) => number) => {
  // The same months the average of what is kept counts: the ones with money moving
  const counted = monthlySeries(state.transactions, addMonths(startMonth, -1), PAST_MONTHS, state.settings)
    .filter((entry) => entry.income > 0 || entry.expense > 0)
    .map((entry) => entry.month);
  // Without a month to average there is nothing for the schedules to move
  if (counted.length === 0) return () => 0;
  const baseline = counted.reduce((sum, month) => sum + scheduledNet(state, month), 0) / counted.length;
  const cache = new Map<string, number>();
  return (month) => {
    let shift = cache.get(month);
    if (shift === undefined) {
      shift = scheduledNet(state, month) - baseline;
      cache.set(month, shift);
    }
    return shift;
  };
};
