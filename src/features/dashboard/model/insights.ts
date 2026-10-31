import {
  accountBalance,
  counts,
  expensesByCategory,
  monthlySeries,
  rollupToParents,
} from "@/features/data/model/finmath";
import type { AccountKind, AppState, Receivable, SavingsAccount, Transaction } from "@/features/data/model/types";
import { suggestSubscriptions, type SubscriptionSuggestion } from "@/features/import/model/import";
import { upcomingObligations, type TaxObligation } from "@/features/income/model/taxCalendar";
import { budgetProgress, isYearly, runsOutOn } from "@/features/transactions/model/budgets";
import { addDays, addMonths, dateInMonth, daysBetween, daysInMonth, monthOf } from "@/shared/lib/date";
import { convert, ratesAt, type Currency } from "@/shared/lib/money";

export type Insight =
  | { kind: "tax"; obligation: TaxObligation }
  | { kind: "loan"; receivable: Receivable }
  | { kind: "over"; categoryId: string; spent: number; limit: number; currency: Currency }
  | { kind: "runsOut"; categoryId: string; date: string; spent: number; limit: number; currency: Currency }
  | { kind: "change"; categoryId: string; now: number; before: number }
  | { kind: "subscription"; suggestion: SubscriptionSuggestion }
  | { kind: "recap"; month: string; income: number; expense: number; categoryId?: string }
  | { kind: "short"; account: SavingsAccount; date: string; balance: number }
  | { kind: "unusual"; tx: Transaction; times: number }
  | { kind: "priceUp"; name: string; categoryId: string; now: number; before: number; currency: Currency }
  | { kind: "review"; count: number };

// How many the overview shows at once
export const INSIGHTS_SHOWN = 3;

// A tax counts once it is overdue or due within this many days
const TAX_DAYS = 7;

// A category's change worth a word: a quarter of what it was, from the 7th
const CHANGE_SHARE = 0.25;
const CHANGE_FROM_DAY = 7;

// The accounts money is spent from, and how far ahead their planned payments count
const SPENDABLE = new Set<AccountKind>(["card", "cash", "wallet", "other"]);
const SHORT_DAYS = 14;

// The first account that planned payments take below zero within two weeks
const runsShort = (state: AppState, today: string): Insight | null => {
  for (const account of state.savings) {
    if (!SPENDABLE.has(account.kind) || accountBalance(account, state.transactions, state.settings, today) < 0)
      continue;
    for (let step = 1; step <= SHORT_DAYS; step += 1) {
      const date = addDays(today, step);
      const balance = accountBalance(account, state.transactions, state.settings, date);
      if (balance < -0.5) return { kind: "short", account, date, balance };
    }
  }
  return null;
};

// Entries typed or imported, as against posted by a schedule or split from another
const isOwn = (tx: Transaction) =>
  tx.type === "expense" && counts(tx) && !tx.recurringId && !tx.subscriptionId && !tx.splitId;

// What an expense is grouped by: where it went, or its category without a note
const placeOf = (tx: Transaction) => {
  const note = tx.note?.trim().toLocaleLowerCase();
  return note === undefined || note === "" ? `#${tx.categoryId}` : note;
};

// The middle of some amounts
const median = (values: number[]) => {
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? (sorted[middle] ?? 0) : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
};

// How many times the usual an expense must be, and how many earlier ones set it
const UNUSUAL_TIMES = 3;
const UNUSUAL_HISTORY = 3;

// This month's expense furthest above the usual for its place, after three earlier
const unusualExpense = (state: AppState, today: string): Insight | null => {
  const month = monthOf(today);
  const since = addDays(`${month}-01`, -90);
  const { settings } = state;
  // An expense in the base currency at the rates of its day
  const inBase = (tx: Transaction) =>
    convert(tx.amount, tx.currency, settings.baseCurrency, ratesAt(settings, tx.date));
  const history = new Map<string, number[]>();
  for (const tx of state.transactions) {
    if (!isOwn(tx) || tx.date < since || monthOf(tx.date) >= month) continue;
    history.set(placeOf(tx), [...(history.get(placeOf(tx)) ?? []), inBase(tx)]);
  }
  let found: Insight | null = null;
  for (const tx of state.transactions) {
    if (!isOwn(tx) || monthOf(tx.date) !== month || tx.date > today) continue;
    const before = history.get(placeOf(tx)) ?? [];
    if (before.length < UNUSUAL_HISTORY) continue;
    const times = inBase(tx) / Math.max(1, median(before));
    if (times >= UNUSUAL_TIMES && (found?.kind !== "unusual" || times > found.times)) {
      found = { kind: "unusual", tx, times };
    }
  }
  return found;
};

// How much more a bill must cost than before to be pointed out
const PRICE_UP_SHARE = 0.05;

// A bill paid three months running or more whose last charge rose against the rest
const priceRise = (state: AppState, today: string): Insight | null => {
  const month = monthOf(today);
  const since = addMonths(month, -6);
  const byPlace = new Map<string, Transaction[]>();
  for (const tx of state.transactions) {
    if (!isOwn(tx) || !tx.note?.trim() || tx.date > today || monthOf(tx.date) < since) continue;
    byPlace.set(placeOf(tx), [...(byPlace.get(placeOf(tx)) ?? []), tx]);
  }
  for (const charges of byPlace.values()) {
    const sorted = charges.toSorted((a, b) => a.date.localeCompare(b.date));
    const last = sorted.at(-1);
    const months = new Set(sorted.map((tx) => monthOf(tx.date)));
    if (!last || months.size !== sorted.length || sorted.length < 4 || monthOf(last.date) < addMonths(month, -1)) {
      continue;
    }
    const earlier = sorted.slice(0, -1).filter((tx) => tx.currency === last.currency);
    const usual = median(earlier.map((tx) => tx.amount));
    if (earlier.length >= 3 && usual > 0 && last.amount > usual * (1 + PRICE_UP_SHARE)) {
      return {
        kind: "priceUp",
        name: last.note?.trim() ?? "",
        categoryId: last.categoryId,
        now: last.amount,
        before: usual,
        currency: last.currency,
      };
    }
  }
  return null;
};

// How many days into a month the one before is summed up
const RECAP_DAYS = 7;

// Last month in a line through the first week of a new one: in, out, top category
const recap = (state: AppState, today: string): Insight | null => {
  if (Number(today.slice(8)) > RECAP_DAYS) return null;
  const month = addMonths(monthOf(today), -1);
  const [totals] = monthlySeries(state.transactions, month, 1, state.settings);
  if (!totals || (totals.income <= 0 && totals.expense <= 0)) return null;
  const byCategory = rollupToParents(expensesByCategory(state.transactions, month, state.settings), state.categories);
  const top = [...byCategory].toSorted((a, b) => b[1] - a[1])[0];
  return { kind: "recap", month, income: totals.income, expense: totals.expense, categoryId: top?.[0] };
};

// Each top category's spending in the base currency up to a day of a month
const spentUpTo = (state: AppState, month: string, day: number): Map<string, number> => {
  const { settings } = state;
  const last = dateInMonth(month, Math.min(day, daysInMonth(month)));
  const byCategory = new Map<string, number>();
  for (const tx of state.transactions) {
    if (tx.type !== "expense" || !counts(tx) || monthOf(tx.date) !== month || tx.date > last) continue;
    const value = convert(tx.amount, tx.currency, settings.baseCurrency, ratesAt(settings, tx.date));
    byCategory.set(tx.categoryId, (byCategory.get(tx.categoryId) ?? 0) + value);
  }
  return rollupToParents(byCategory, state.categories);
};

// The category that moved most against the same day last month, if enough
const biggestChange = (state: AppState, today: string): Insight | null => {
  const day = Number(today.slice(8));
  if (day < CHANGE_FROM_DAY) return null;
  const month = monthOf(today);
  const now = spentUpTo(state, month, day);
  const before = spentUpTo(state, addMonths(month, -1), day);
  let best: Insight | null = null;
  let bestDelta = 0;
  for (const [categoryId, was] of before) {
    const is = now.get(categoryId) ?? 0;
    const delta = Math.abs(is - was);
    if (was <= 0 || is <= 0 || delta / was < CHANGE_SHARE || delta <= bestDelta) continue;
    best = { kind: "change", categoryId, now: is, before: was };
    bestDelta = delta;
  }
  return best;
};

// What the overview points out, the most pressing first: taxes, loans, budgets
export const dashboardInsights = (state: AppState, today: string, dismissed: readonly string[] = []): Insight[] => {
  const month = monthOf(today);
  const found: Insight[] = [];
  const tax = upcomingObligations(state, today, 3).find(
    (obligation) => obligation.amount !== undefined && daysBetween(today, obligation.due) <= TAX_DAYS,
  );
  if (tax) found.push({ kind: "tax", obligation: tax });
  const loan = state.receivables.find((item) => item.repaid < item.amount && item.dueDate && item.dueDate < today);
  if (loan) found.push({ kind: "loan", receivable: loan });
  const waiting = state.transactions.filter((tx) => tx.unreviewed === true).length;
  if (waiting > 0) found.push({ kind: "review", count: waiting });
  const short = runsShort(state, today);
  if (short) found.push(short);
  for (const budget of state.budgets) {
    const { spent, limit } = budgetProgress(state, budget, month);
    const shared = { categoryId: budget.categoryId, spent, limit, currency: budget.currency };
    const date = runsOutOn(spent, limit, month, today, isYearly(budget));
    if (spent > limit) found.push({ kind: "over", ...shared });
    else if (date) found.push({ kind: "runsOut", date, ...shared });
  }
  const unusual = unusualExpense(state, today);
  if (unusual) found.push(unusual);
  const rise = priceRise(state, today);
  if (rise) found.push(rise);
  const summary = recap(state, today);
  if (summary) found.push(summary);
  const change = biggestChange(state, today);
  if (change) found.push(change);
  const suggestion = suggestSubscriptions(state, today).find((item) => !dismissed.includes(item.key));
  if (suggestion) found.push({ kind: "subscription", suggestion });
  return found.slice(0, INSIGHTS_SHOWN);
};
