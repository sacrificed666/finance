import { subscriptionStatus, type SubscriptionStatus } from "@/features/data/model/finmath";
import type { AppState, Subscription } from "@/features/data/model/types";
import { syncSchedule } from "@/features/transactions/model/schedules";

export const SUBSCRIPTION_VIEWS = ["now", "upcoming", "ended", "paused", "all"] as const;
export const SUBSCRIPTION_SORTS = ["name", "price", "day"] as const;

export type SubscriptionView = (typeof SUBSCRIPTION_VIEWS)[number];
export type SubscriptionSort = (typeof SUBSCRIPTION_SORTS)[number];

// The status each view but "all" shows
export const VIEW_STATUS: Record<Exclude<SubscriptionView, "all">, SubscriptionStatus> = {
  now: "active",
  upcoming: "upcoming",
  ended: "ended",
  paused: "paused",
};

// How many subscriptions are active, waiting, ended or paused in a month
export const subscriptionCounts = (subscriptions: readonly Subscription[], month: string) => {
  const counts: Record<SubscriptionStatus, number> = { active: 0, upcoming: 0, ended: 0, paused: 0 };
  for (const subscription of subscriptions) counts[subscriptionStatus(subscription, month)]++;
  return counts;
};

export type SubscriptionProblem =
  | "tx.subs.problem.name"
  | "tx.subs.problem.price"
  | "problem.day"
  | "problem.endBeforeStart";

export interface SubscriptionDraft {
  name: string;
  price: number;
  dayOfMonth: number;
  startMonth: string;
  endMonth: string;
}

// What stops a subscription from being saved, the first problem only, or null
export const subscriptionProblem = (draft: SubscriptionDraft): SubscriptionProblem | null => {
  if (draft.name.trim() === "") return "tx.subs.problem.name";
  if (!Number.isFinite(draft.price) || draft.price <= 0) return "tx.subs.problem.price";
  if (!Number.isInteger(draft.dayOfMonth) || draft.dayOfMonth < 1 || draft.dayOfMonth > 31) return "problem.day";
  if (!/^\d{4}-\d{2}$/u.test(draft.startMonth) || (draft.endMonth !== "" && draft.endMonth < draft.startMonth)) {
    return "problem.endBeforeStart";
  }
  return null;
};

// The subscriptions with one saved and its coming charges posted again
export const saveSubscription = (state: AppState, subscription: Subscription): AppState => {
  const previous = state.subscriptions.find((item) => item.id === subscription.id);
  const subscriptions = previous
    ? state.subscriptions.map((item) =>
        item.id === subscription.id ? { ...subscription, active: item.active, skipped: item.skipped } : item,
      )
    : [...state.subscriptions, subscription];
  return syncSchedule({ ...state, subscriptions }, "subscription", subscription.id, previous);
};

// The subscriptions with a paused one running again from today on
export const resumeSubscription = (state: AppState, id: string): AppState => {
  const previous = state.subscriptions.find((item) => item.id === id);
  if (!previous) return state;
  const subscriptions = state.subscriptions.map((item) => (item.id === id ? { ...item, active: true } : item));
  return syncSchedule({ ...state, subscriptions }, "subscription", id, previous);
};
