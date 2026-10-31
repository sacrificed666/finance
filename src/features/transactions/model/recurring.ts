import { bookingsInMonth, nextBooking, perMonth } from "@/features/data/model/frequency";
import type { AppState, Frequency, RecurringRule, Transaction } from "@/features/data/model/types";
import { syncSchedule } from "@/features/transactions/model/schedules";
import { addDays, addMonths, dateInMonth, daysBetween, monthOf } from "@/shared/lib/date";
import { convert } from "@/shared/lib/money";

export type RecurringStatus = "now" | "upcoming" | "ended";

export type RecurringView = RecurringStatus | "all";

// Whether a recurring rule runs in a month, starts later or has ended
export const recurringStatus = (rule: RecurringRule, month: string): RecurringStatus => {
  if (rule.startMonth > month) return "upcoming";
  if (rule.endMonth && rule.endMonth < month) return "ended";
  return "now";
};

// How many rules run, wait or have ended in a month
export const statusCounts = (rules: readonly RecurringRule[], month: string) => {
  const counts: Record<RecurringStatus, number> = { now: 0, upcoming: 0, ended: 0 };
  for (const rule of rules) counts[recurringStatus(rule, month)]++;
  return counts;
};

// What some rules bring in and take out each month, in the base currency
export const monthlyFlow = (state: AppState, rules: readonly RecurringRule[]) => {
  const { settings } = state;
  const flow = { in: 0, out: 0 };
  for (const rule of rules) {
    const amount = convert(perMonth(rule.amount, rule.period), rule.currency, settings.baseCurrency, settings.rates);
    if (rule.type === "income") flow.in += amount;
    else flow.out += amount;
  }
  return flow;
};

// The next day after today one of the rules posts an entry
export const nextPosting = (rules: readonly RecurringRule[], today: string) =>
  rules
    .flatMap((rule) => {
      const date = nextBooking(rule, addDays(today, 1));
      return date ? [date] : [];
    })
    .toSorted()[0];

export type RecurringProblem = "problem.amount" | "problem.day" | "problem.category" | "problem.endBeforeStart";

export interface RecurringDraft {
  amount: number;
  dayOfMonth: number;
  categoryId: string;
  startMonth: string;
  endMonth: string;
}

// What stops a recurring rule from being saved, the first problem only, or null
export const recurringProblem = (draft: RecurringDraft): RecurringProblem | null => {
  if (!Number.isFinite(draft.amount) || draft.amount <= 0) return "problem.amount";
  if (!Number.isInteger(draft.dayOfMonth) || draft.dayOfMonth < 1 || draft.dayOfMonth > 31) return "problem.day";
  if (draft.categoryId === "") return "problem.category";
  if (!/^\d{4}-\d{2}$/u.test(draft.startMonth) || (draft.endMonth !== "" && draft.endMonth < draft.startMonth)) {
    return "problem.endBeforeStart";
  }
  return null;
};

// The rules with one added or changed, its coming entries posted again to match it
export const saveRecurring = (state: AppState, rule: RecurringRule): AppState => {
  const previous = state.recurring.find((item) => item.id === rule.id);
  const recurring = previous
    ? state.recurring.map((item) => (item.id === rule.id ? { ...item, ...rule } : item))
    : [...state.recurring, rule];
  return syncSchedule({ ...state, recurring }, "recurring", rule.id, previous);
};

// Whether an entry can start a rule: no transfer, split part or planned entry
export const canRepeat = (entry: Transaction | undefined): entry is Transaction =>
  entry !== undefined &&
  entry.type !== "transfer" &&
  !entry.splitId &&
  entry.recurringId === undefined &&
  entry.subscriptionId === undefined;

// A monthly rule as an entry suggests it: its fields, from its day and month on
export const ruleFromEntry = (entry: Transaction, id: string): RecurringRule => ({
  id,
  type: entry.type === "income" ? "income" : "expense",
  amount: entry.amount,
  currency: entry.currency,
  categoryId: entry.categoryId,
  note: entry.note,
  accountId: entry.accountId,
  dayOfMonth: Number(entry.date.slice(8, 10)),
  startMonth: monthOf(entry.date),
});

// Whether a rule books the day or month an entry falls on
const booksEntry = (rule: RecurringRule, entry: Transaction): boolean => {
  if (bookingsInMonth(rule, monthOf(entry.date)) === 0) return false;
  if (rule.period !== "weekly") return true;
  const days = daysBetween(dateInMonth(rule.startMonth, rule.dayOfMonth), entry.date);
  return days >= 0 && days % 7 === 0;
};

// A new rule from an entry, which becomes its booking when it falls on one
export const startRuleFrom = (state: AppState, entryId: string, rule: RecurringRule): AppState => {
  const entry = state.transactions.find((item) => item.id === entryId);
  if (!canRepeat(entry)) return state;
  const link = booksEntry(rule, entry);
  const transactions = link
    ? state.transactions.map((item) => (item.id === entryId ? { ...item, recurringId: rule.id } : item))
    : state.transactions;
  return syncSchedule({ ...state, transactions, recurring: [...state.recurring, rule] }, "recurring", rule.id, rule);
};

// The months between an instalment plan's payments, weekly ones not offered
const INSTALMENT_STEP: Record<Exclude<Frequency, "weekly">, number> = { monthly: 1, quarterly: 3, yearly: 12 };

// The month of an instalment plan's last payment
export const instalmentEnd = (startMonth: string, count: number, period: Frequency = "monthly"): string =>
  addMonths(startMonth, (count - 1) * (period === "weekly" ? 1 : INSTALMENT_STEP[period]));

// One payment of an instalment plan, to the cent
export const instalmentPayment = (total: number, count: number): number => Math.round((total / count) * 100) / 100;

// How many payments of an instalment plan have come and what is still to pay
export const instalmentProgress = (state: AppState, rule: RecurringRule, today: string) => {
  const plan = rule.instalment;
  if (!plan) return null;
  const paid = Math.min(
    plan.count,
    state.transactions.filter((tx) => tx.recurringId === rule.id && tx.date <= today).length,
  );
  return { paid, count: plan.count, left: Math.max(0, plan.total - paid * rule.amount) };
};
