import { normalizeTags } from "@/features/data/model/normalize";
import type { AppState, SavedView, Transaction } from "@/features/data/model/types";
import { descendantsOf } from "@/features/transactions/model/categories";
import { addMonths, monthOf } from "@/shared/lib/date";
import { matchesQuery } from "@/shared/lib/listing";
import { convert, ratesAt } from "@/shared/lib/money";

export const LEDGER_SORTS = ["date", "amount", "category", "account"] as const;
export const LEDGER_SCOPES = ["month", "quarter", "year", "all"] as const;
export const LEDGER_TIMINGS = ["all", "posted", "planned"] as const;
export const LEDGER_KINDS = ["all", "expense", "income", "transfer"] as const;

export type LedgerSort = (typeof LEDGER_SORTS)[number];
export type LedgerScope = (typeof LEDGER_SCOPES)[number];
export type LedgerTiming = (typeof LEDGER_TIMINGS)[number];
export type LedgerKind = (typeof LEDGER_KINDS)[number];

export interface LedgerFilter {
  query: string;
  categoryId: string;
  accountId: string;
  tag: string;
  timing: LedgerTiming;
  review: boolean;
}

export const NO_FILTER: LedgerFilter = {
  query: "",
  categoryId: "",
  accountId: "",
  tag: "",
  timing: "all",
  review: false,
};

// Whether any filter narrows the entries
export const isFiltering = (filter: LedgerFilter) =>
  filter.query.trim() !== "" ||
  filter.categoryId !== "" ||
  filter.accountId !== "" ||
  filter.tag !== "" ||
  filter.timing !== "all" ||
  filter.review;

// The bank's entries still waiting for a look
export const toReview = (transactions: readonly Transaction[]): Transaction[] =>
  transactions.filter((tx) => tx.unreviewed === true);

// The entries taken as they are, out of the review queue
export const markReviewed = (state: AppState, ids: ReadonlySet<string>): AppState => ({
  ...state,
  transactions: state.transactions.map((tx) => {
    if (!ids.has(tx.id) || !tx.unreviewed) return tx;
    const { unreviewed: _done, ...rest } = tx;
    return rest;
  }),
});

// A search, kind and period kept under a name
export const viewOf = (
  id: string,
  name: string,
  kind: LedgerKind,
  scope: LedgerScope,
  filter: LedgerFilter,
): SavedView => ({
  id,
  name: name.trim().slice(0, 40),
  kind,
  scope,
  query: filter.query.trim(),
  categoryId: filter.categoryId,
  accountId: filter.accountId,
  tag: filter.tag,
  timing: filter.timing,
});

// Whether the ledger shows exactly what a saved view keeps
export const showsView = (view: SavedView, kind: LedgerKind, scope: LedgerScope, filter: LedgerFilter) =>
  view.kind === kind &&
  view.scope === scope &&
  view.query === filter.query.trim() &&
  view.categoryId === filter.categoryId &&
  view.accountId === filter.accountId &&
  view.tag === filter.tag &&
  view.timing === filter.timing &&
  !filter.review;

// The settings with a saved view added, or replaced when it has the same name
export const saveView = (state: AppState, view: SavedView): AppState => {
  const others = (state.settings.ledgerViews ?? []).filter(
    (item) => item.name.toLocaleLowerCase() !== view.name.toLocaleLowerCase(),
  );
  return { ...state, settings: { ...state.settings, ledgerViews: [...others, view].slice(-12) } };
};

// The settings without a saved view
export const removeView = (state: AppState, id: string): AppState => {
  const left = (state.settings.ledgerViews ?? []).filter((item) => item.id !== id);
  return { ...state, settings: { ...state.settings, ledgerViews: left.length > 0 ? left : undefined } };
};

// How many of the filters behind the Filters button narrow the entries
export const extraFilters = (filter: LedgerFilter) =>
  [filter.categoryId !== "", filter.accountId !== "", filter.tag !== "", filter.timing !== "all"].filter(Boolean)
    .length;

// The first and the last month a scope reaches back from a month
export const scopeMonths = (scope: LedgerScope, month: string) => {
  const year = month.slice(0, 4);
  if (scope === "quarter") return { start: addMonths(month, -2), end: month };
  if (scope === "year") return { start: `${year}-01`, end: `${year}-12` };
  return { start: month, end: month };
};

// Whether an entry falls into the scope
export const inScope = (tx: Transaction, scope: LedgerScope, month: string) => {
  if (scope === "all") return true;
  const { start, end } = scopeMonths(scope, month);
  const entryMonth = monthOf(tx.date);
  return entryMonth >= start && entryMonth <= end;
};

// Only the digits of a text, to find amounts however they are written
const digitsOf = (text: string) => text.replaceAll(/\D/gu, "");

// A test of the kind and filter; a search matches texts and the amount's digits
export const ledgerMatcher = (
  kind: LedgerKind,
  filter: LedgerFilter,
  state: AppState,
  today: string,
  texts: (tx: Transaction) => (string | undefined)[],
) => {
  const inCategory = filter.categoryId ? descendantsOf(state.categories, filter.categoryId) : null;
  const query = filter.query.trim().toLowerCase();
  const digits = digitsOf(query);
  return (tx: Transaction) => {
    if (kind !== "all" && tx.type !== kind) return false;
    if (filter.timing === "posted" && tx.date > today) return false;
    if (filter.timing === "planned" && tx.date <= today) return false;
    if (inCategory && !inCategory.has(tx.categoryId)) return false;
    if (filter.accountId && tx.accountId !== filter.accountId && tx.toAccountId !== filter.accountId) return false;
    if (filter.tag && !(tx.tags ?? []).includes(filter.tag)) return false;
    if (filter.review && !tx.unreviewed) return false;
    if (!query || matchesQuery(query, ...texts(tx))) return true;
    return digits.length > 0 && digitsOf(String(tx.amount)).includes(digits);
  };
};

// The amount of an entry in the base currency, negative for an expense
export const signedAmount = (state: AppState, tx: Transaction) => {
  const { settings } = state;
  return (
    (tx.type === "expense" ? -1 : 1) *
    convert(tx.amount, tx.currency, settings.baseCurrency, ratesAt(settings, tx.date))
  );
};

// The income less the expenses of some entries; transfers only move money
export const netOf = (state: AppState, entries: readonly Transaction[]) =>
  entries.reduce((sum, tx) => (tx.type === "transfer" ? sum : sum + signedAmount(state, tx)), 0);

// The entries of each day, in the order they came
export const byDay = (entries: readonly Transaction[]) => {
  const days = new Map<string, Transaction[]>();
  for (const tx of entries) {
    const list = days.get(tx.date);
    if (list) list.push(tx);
    else days.set(tx.date, [tx]);
  }
  return days;
};

// The name of the CSV file of the shown entries
export const ledgerFileName = (scope: LedgerScope, month: string, today: string) => {
  if (scope === "all") return `entries-all-${today}.csv`;
  const { start, end } = scopeMonths(scope, month);
  return `entries-${start === end ? start : `${start}_${end}`}.csv`;
};

// The picked entries of the category's kind, expense or income
export const recategorisable = (state: AppState, picked: ReadonlySet<string>, categoryId: string) => {
  const kind = state.categories.find((entry) => entry.id === categoryId)?.kind;
  return new Set(
    state.transactions.filter((tx) => picked.has(tx.id) && kind !== undefined && tx.type === kind).map((tx) => tx.id),
  );
};

// The entries with a new category
export const setCategory = (state: AppState, ids: ReadonlySet<string>, categoryId: string): AppState => ({
  ...state,
  transactions: state.transactions.map((tx) => (ids.has(tx.id) ? { ...tx, categoryId } : tx)),
});

// The entries with one more tag, cleaned like every tag
export const addTag = (state: AppState, ids: ReadonlySet<string>, tag: string): AppState => ({
  ...state,
  transactions: state.transactions.map((tx) =>
    ids.has(tx.id) ? { ...tx, tags: normalizeTags([...(tx.tags ?? []), tag]) } : tx,
  ),
});

// The entries without the picked ones
export const deleteEntries = (state: AppState, ids: ReadonlySet<string>): AppState => ({
  ...state,
  transactions: state.transactions.filter((tx) => !ids.has(tx.id)),
});
