import { activeAccounts } from "@/features/accounts/model/accounts";
import type { AppState, CategoryKind, Transaction, TxType } from "@/features/data/model/types";
import { categoryTree } from "@/features/transactions/model/categories";
import type { MessageParams } from "@/shared/i18n/translate";
import { dateInMonth, monthOf } from "@/shared/lib/date";
import { convert, parseAmount, type Currency } from "@/shared/lib/money";

export interface SplitDraft {
  key: string;
  categoryId: string;
  amount: string;
}

export interface EntryForm {
  id: string | null;
  type: TxType;
  amount: string;
  currency: Currency;
  categoryId: string;
  date: string;
  note: string;
  accountId: string;
  toAccountId: string;
  toAmount: string;
  tags: string[];
  attachmentIds: string[];
  splits: SplitDraft[];
  excluded: boolean;
  receipt: NonNullable<Transaction["receipt"]> | null;
  share: { name: string; amount: string } | null;
}

// The first category of a kind, to start an entry of that kind with
export const firstCategoryId = (state: AppState, kind: CategoryKind) =>
  categoryTree(state.categories, kind)[0]?.parent.id ?? "";

// A new entry's form, or the edited one's; a transfer needs two accounts
export const initialEntryForm = (
  state: AppState,
  target: Transaction | "new",
  month: string,
  today: string,
  date?: string,
  asked: TxType = "expense",
): EntryForm => {
  if (target === "new") {
    const accounts = activeAccounts(state.savings);
    const type = asked === "transfer" && accounts.length < 2 ? "expense" : asked;
    return {
      id: null,
      type,
      amount: "",
      currency: accounts[0]?.currency ?? state.settings.baseCurrency,
      categoryId: type === "transfer" ? "" : firstCategoryId(state, type),
      date: date ?? (month === monthOf(today) ? today : dateInMonth(month, 1)),
      note: "",
      accountId: accounts[0]?.id ?? "",
      toAccountId: accounts[1]?.id ?? "",
      toAmount: "",
      tags: [],
      attachmentIds: [],
      splits: [],
      excluded: false,
      receipt: null,
      share: null,
    };
  }
  return {
    id: target.id,
    type: target.type,
    amount: String(target.amount),
    currency: target.currency,
    categoryId: target.categoryId,
    date: target.date,
    note: target.note ?? "",
    accountId: target.accountId ?? "",
    toAccountId: target.toAccountId ?? "",
    toAmount: target.toAmount === undefined ? "" : String(target.toAmount),
    tags: target.tags ?? [],
    attachmentIds: target.attachmentIds ?? [],
    splits: [],
    excluded: target.excluded === true,
    receipt: target.receipt ?? null,
    share: null,
  };
};

// The form as another kind: a transfer takes two accounts and no split
export const switchEntryType = (state: AppState, form: EntryForm, type: TxType): EntryForm => {
  if (type !== "transfer") return { ...form, type, categoryId: firstCategoryId(state, type) };
  const accounts = activeAccounts(state.savings);
  const accountId = form.accountId || (accounts[0]?.id ?? "");
  return {
    ...form,
    type,
    categoryId: "",
    splits: [],
    receipt: null,
    accountId,
    toAccountId: form.toAccountId || (accounts.find((account) => account.id !== accountId)?.id ?? ""),
  };
};

// Every tag used so far, the most used first
export const knownTags = (state: AppState): string[] => {
  const counts = new Map<string, number>();
  for (const tx of state.transactions) for (const tag of tx.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts.entries()].toSorted((a, b) => b[1] - a[1]).map(([tag]) => tag);
};

export interface EntryProblem {
  key:
    | "problem.amount"
    | "tx.split.problem"
    | "problem.date"
    | "problem.category"
    | "tx.problem.bothAccounts"
    | "tx.problem.sameAccount"
    | "tx.problem.arrived"
    | "tx.share.problem";
  params?: MessageParams;
}

// The amounts of the form, its split parts and the rest for the main category
export const entryFigures = (state: AppState, form: EntryForm) => {
  const from = state.savings.find((account) => account.id === form.accountId);
  const to = state.savings.find((account) => account.id === form.toAccountId);
  const amount = parseAmount(form.amount);
  const splitAmounts = form.splits.map((split) => parseAmount(split.amount));
  const splitTotal = splitAmounts.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
  return {
    from,
    to,
    amount,
    toAmount: parseAmount(form.toAmount),
    crossCurrency: form.type === "transfer" && from !== undefined && to !== undefined && from.currency !== to.currency,
    splitAmounts,
    rest: amount - splitTotal,
    owed: form.share ? parseAmount(form.share.amount) : 0,
  };
};

// What stops the entry from being saved, the first problem only, or null
export const entryProblem = (state: AppState, form: EntryForm): EntryProblem | null => {
  const { amount, toAmount, crossCurrency, splitAmounts, rest, to, owed } = entryFigures(state, form);
  const splitsValid =
    form.splits.length === 0 ||
    (splitAmounts.every((value) => Number.isFinite(value) && value > 0) &&
      form.splits.every((split) => split.categoryId !== "") &&
      rest > 0);
  if (!Number.isFinite(amount) || amount <= 0) return { key: "problem.amount" };
  if (!splitsValid) return { key: "tx.split.problem" };
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(form.date)) return { key: "problem.date" };
  if (form.share && (form.share.name.trim() === "" || !Number.isFinite(owed) || owed <= 0 || owed >= amount)) {
    return { key: "tx.share.problem" };
  }
  if (form.type !== "transfer") return form.categoryId === "" ? { key: "problem.category" } : null;
  if (form.accountId === "" || form.toAccountId === "") return { key: "tx.problem.bothAccounts" };
  if (form.accountId === form.toAccountId) return { key: "tx.problem.sameAccount" };
  if (crossCurrency && !(Number.isFinite(toAmount) && toAmount > 0)) {
    return { key: "tx.problem.arrived", params: { name: to?.name ?? "" } };
  }
  return null;
};

// The total of a split entry's parts in a currency
export const splitTotalIn = (state: AppState, parts: readonly Transaction[], currency: Currency) =>
  parts.reduce((sum, tx) => sum + convert(tx.amount, tx.currency, currency, state.settings.rates), 0);

// The bank's line of an entry, keeping the bank's own words once it is renamed
const bankWords = (tx: Transaction, note: string | undefined): Transaction["bank"] =>
  tx.externalId && tx.note && note !== tx.note && !tx.bank?.text ? { ...tx.bank, text: tx.note } : tx.bank;

// What an entry keeps through an edit that the form does not show
const keptThroughEdit = (tx: Transaction, type: TxType): Transaction => ({
  ...tx,
  ...(type === "income" && tx.type === "income" ? {} : { breakdown: undefined, tax: undefined }),
  ...(type === "transfer" ? {} : { toAccountId: undefined, toAmount: undefined }),
});

// A shared expense: my part, theirs kept out of reports, and what they owe
const shareNew = (
  state: AppState,
  form: EntryForm,
  fields: Omit<Transaction, "id">,
  extras: Pick<Transaction, "tags" | "attachmentIds">,
  makeId: () => string,
): AppState => {
  const { amount, owed } = entryFigures(state, form);
  const name = form.share?.name.trim().slice(0, 80) ?? "";
  const splitId = makeId();
  const partId = makeId();
  const mine: Transaction = { id: makeId(), ...fields, ...extras, amount: amount - owed, splitId };
  const theirs: Transaction = {
    ...fields,
    id: partId,
    amount: owed,
    note: name,
    excluded: true,
    splitId,
    receipt: undefined,
  };
  return {
    ...state,
    transactions: [...state.transactions, mine, theirs],
    receivables: [
      ...state.receivables,
      {
        id: makeId(),
        name,
        icon: "🤝",
        amount: owed,
        currency: form.currency,
        date: form.date,
        repaid: 0,
        note: fields.note,
        entryId: partId,
      },
    ],
  };
};

// The entries with the form saved in place or added, its split parts after it
export const saveEntry = (
  state: AppState,
  form: EntryForm,
  target: Transaction | "new",
  makeId: () => string,
): AppState => {
  const { from, amount, toAmount, crossCurrency, splitAmounts, rest } = entryFigures(state, form);
  const note = form.note.trim() || undefined;
  const fields: Omit<Transaction, "id"> =
    form.type === "transfer"
      ? {
          type: "transfer",
          amount,
          currency: from?.currency ?? form.currency,
          categoryId: "",
          date: form.date,
          note,
          accountId: form.accountId,
          toAccountId: form.toAccountId,
          toAmount: crossCurrency ? toAmount : amount,
        }
      : {
          type: form.type,
          amount: form.splits.length > 0 ? rest : amount,
          currency: form.currency,
          categoryId: form.categoryId,
          date: form.date,
          note,
          accountId: form.accountId || undefined,
          excluded: form.excluded || undefined,
          receipt: form.receipt ?? undefined,
        };
  const tags = form.tags.length > 0 ? form.tags : undefined;
  const attachmentIds = form.attachmentIds.length > 0 ? form.attachmentIds : undefined;
  const earlierSplit = target === "new" ? undefined : target.splitId;
  const splitId = form.splits.length > 0 ? (earlierSplit ?? makeId()) : earlierSplit;
  const parts: Transaction[] = form.splits.map((split, index) => ({
    ...fields,
    id: makeId(),
    amount: splitAmounts[index] ?? 0,
    categoryId: split.categoryId,
    tags,
    splitId,
  }));
  if (form.share && form.id === null && form.type === "expense" && form.splits.length === 0) {
    return shareNew(state, form, fields, { tags, attachmentIds }, makeId);
  }
  const transactions = form.id
    ? state.transactions.map((tx) =>
        tx.id === form.id
          ? {
              ...keptThroughEdit(tx, form.type),
              ...fields,
              tags,
              attachmentIds,
              splitId,
              unreviewed: undefined,
              bank: bankWords(tx, note),
            }
          : tx,
      )
    : [...state.transactions, { id: makeId(), ...fields, tags, attachmentIds, splitId }];
  return { ...state, transactions: [...transactions, ...parts] };
};
