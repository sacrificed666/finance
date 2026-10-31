import type { AppState, CategoryRule, Transaction } from "@/features/data/model/types";
import { looksLikeBill } from "@/features/transactions/model/categories";
import { addMonths, monthDiff, monthOf } from "@/shared/lib/date";
import type { Currency } from "@/shared/lib/money";

export interface ImportCandidate {
  externalId: string;
  date: string;
  time?: number;
  type: "income" | "expense" | "transfer";
  amount: number;
  currency: Currency;
  opAmount?: number;
  opCurrency?: Currency;
  description: string;
  mcc?: number;
  categoryId: string;
  duplicate: boolean;
  accountId?: string;
  toAccountId?: string;
  toAmount?: number;
  pairedId?: string;
  planned?: { id: string; label: string };
}

const MCC_CATEGORIES: Array<[ranges: Array<number | [number, number]>, ids: string[]]> = [
  [
    [5411, 5412, 5422, 5441, 5451, 5462, 5499],
    ["cat-groceries", "cat-food"],
  ],
  [
    [5812, 5813],
    ["cat-restaurants", "cat-food"],
  ],
  [[5814], ["cat-coffee", "cat-restaurants", "cat-food"]],
  [[4121], ["cat-taxi", "cat-transport"]],
  [
    [4111, 4112, 4131],
    ["cat-public-transport", "cat-transport"],
  ],
  [
    [5541, 5542, 5983],
    ["cat-fuel", "cat-transport"],
  ],
  [[7523], ["cat-parking", "cat-transport"]],
  [
    [[7531, 7549], 5533],
    ["cat-car", "cat-transport"],
  ],
  [
    [5912, 5122],
    ["cat-pharmacy", "cat-health"],
  ],
  [[[8011, 8099]], ["cat-doctors", "cat-health"]],
  [
    [7997, 7941, 7298],
    ["cat-fitness", "cat-health"],
  ],
  [[6300], ["cat-insurance", "cat-health"]],
  [
    [[5611, 5699], 5137, 5139],
    ["cat-clothes", "cat-shopping"],
  ],
  [
    [5732, 5734, 5045, 5946],
    ["cat-electronics", "cat-shopping"],
  ],
  [
    [5977, 7230],
    ["cat-beauty", "cat-shopping"],
  ],
  [[5300, 5310, 5311, 5331, 5399, 5200, 5251], ["cat-shopping"]],
  [
    [4814, 4816],
    ["cat-internet", "cat-housing"],
  ],
  [[4899, 5815, 5816, 5817, 5818], ["cat-subs"]],
  [[4900], ["cat-utilities", "cat-housing"]],
  [
    [7832, 7922, 7929, 7996, 7991],
    ["cat-events", "cat-wants"],
  ],
  [
    [5945, 5970, 5971],
    ["cat-hobbies", "cat-wants"],
  ],
  [
    [[3000, 3299], 4511, [3500, 3999], 7011, 4722, 4411],
    ["cat-travel", "cat-wants"],
  ],
  [
    [5942, 5994],
    ["cat-books", "cat-education"],
  ],
  [
    [8211, 8220, 8241, 8244, 8249, 8299],
    ["cat-courses", "cat-education"],
  ],
  [[5995, 742], ["cat-pets"]],
  [[8398, 8661], ["cat-charity"]],
  [[9211, 9222, 9311, 9399], ["cat-taxes"]],
];

// Whether a merchant code falls in one of the codes or ranges
const mccMatches = (mcc: number, ranges: Array<number | [number, number]>): boolean => {
  return ranges.some((r) => (Array.isArray(r) ? mcc >= r[0] && mcc <= r[1] : mcc === r));
};

// The category a description and merchant code most likely belong to
export const suggestCategory = (
  state: AppState,
  description: string,
  type: "income" | "expense",
  mcc?: number,
): string => {
  const text = description.toLocaleLowerCase();
  // Whether a category of the type exists
  const exists = (id: string) => state.categories.some((c) => c.id === id && c.kind === type);
  const rule = state.rules.find((r) => r.type === type && ruleMatches(r, text) && exists(r.categoryId));
  if (rule) return rule.categoryId;
  if (type === "expense" && mcc !== undefined) {
    for (const [ranges, ids] of MCC_CATEGORIES) {
      if (!mccMatches(mcc, ranges)) continue;
      const hit = ids.find(exists);
      if (hit) return hit;
    }
  }
  if (type === "income" && /cashback|кешбек|кэшбэк/i.test(description) && exists("cat-cashback")) return "cat-cashback";
  const fallback = type === "expense" ? "cat-other-exp" : "cat-other-inc";
  if (exists(fallback)) return fallback;
  return state.categories.find((c) => c.kind === type && !c.parentId)?.id ?? "";
};

// Whether an entry stands in for a planned one not yet confirmed
export const isPlaceholder = (tx: Transaction): boolean => {
  return Boolean(tx.recurringId ?? tx.subscriptionId) || tx.id.startsWith("tax:");
};

// Every bank operation the account already has, both sides of a transfer too
const knownOperations = (state: AppState): Set<string> =>
  new Set(state.transactions.flatMap((tx) => [tx.externalId, tx.bank?.pairedId].filter((id) => id !== undefined)));

// The day, type, amount and words of an entry, to spot one typed by hand
const looseKey = (date: string, type: string, amount: number, note: string): string =>
  `${date}|${type}|${amount.toFixed(2)}|${note.toLocaleLowerCase()}`;

// Uses up one entry of a kind and names it, or says none is left
const takeOne = (entries: Map<string, string[]>, key: string): string | undefined => entries.get(key)?.shift();

// Sums closer than half a kopiyka are the same sum
const CENT = 0.005;
const DAY_MS = 86_400_000;

// How many days apart a bank operation and the entry typed for it may be
const TYPED_DAYS = 1;

// Whether an entry typed by hand is the one a bank operation records
const typedFor = (tx: Transaction, c: ImportCandidate): boolean =>
  !tx.externalId &&
  !isPlaceholder(tx) &&
  tx.type === c.type &&
  tx.currency === c.currency &&
  Math.abs(tx.amount - c.amount) < CENT &&
  Math.abs(Date.parse(tx.date) - Date.parse(c.date)) <= TYPED_DAYS * DAY_MS &&
  (!tx.accountId || !c.accountId || tx.accountId === c.accountId);

// The entries marked when the account already has them, each match used once
export const markDuplicates = (state: AppState, candidates: ImportCandidate[]): ImportCandidate[] => {
  const ids = knownOperations(state);
  const loose = new Map<string, string[]>();
  for (const tx of state.transactions) {
    if (!tx.externalId && isPlaceholder(tx)) continue;
    const key = looseKey(tx.date, tx.type, tx.amount, tx.note ?? "");
    loose.set(key, [...(loose.get(key) ?? []), tx.id]);
  }
  // The key an operation would have as an entry
  const keyOf = (c: ImportCandidate) => looseKey(c.date, c.type, c.amount, c.description);
  const used = new Set<string>();
  // Uses up the entry of an operation's key, if one is left
  const take = (c: ImportCandidate): boolean => {
    const id = takeOne(loose, keyOf(c));
    if (id !== undefined) used.add(id);
    return id !== undefined;
  };
  const known = candidates.map((c) => ids.has(c.externalId) || (c.pairedId !== undefined && ids.has(c.pairedId)));
  candidates.forEach((c, index) => {
    if (known[index]) take(c);
  });
  const marked = candidates.map((c, index) => known[index] === true || take(c));
  // A typed entry of the same sum a day apart counts too, each used once
  const typed = (c: ImportCandidate): boolean => {
    if (c.type === "transfer") return false;
    const match = state.transactions.find((tx) => !used.has(tx.id) && typedFor(tx, c));
    if (match) used.add(match.id);
    return match !== undefined;
  };
  const typedToo = candidates.map((c, index) => marked[index] === true || typed(c));
  return candidates.map((c, index) => ({ ...c, duplicate: typedToo[index] === true }));
};

const TRANSFER_WINDOW_S = 15 * 60;

// Whether money that left one account is the money that came into another
const sameMoney = (out: ImportCandidate, into: ImportCandidate): boolean => {
  if (out.currency === into.currency && Math.abs(out.amount - into.amount) < CENT) return true;
  if (out.opCurrency === into.currency && out.opAmount !== undefined && Math.abs(out.opAmount - into.amount) < CENT)
    return true;
  return into.opCurrency === out.currency && into.opAmount !== undefined && Math.abs(into.opAmount - out.amount) < CENT;
};

// Whether two operations happened within a few minutes of each other
const sameMoment = (a: ImportCandidate, b: ImportCandidate): boolean => {
  if (a.time !== undefined && b.time !== undefined) return Math.abs(a.time - b.time) <= TRANSFER_WINDOW_S;
  return a.date === b.date;
};

// Pairs of operations between own accounts turned into transfers
export const pairTransfers = (candidates: ImportCandidate[]): ImportCandidate[] => {
  const partnerOf = new Map<string, ImportCandidate>();
  const taken = new Set<string>();
  for (const out of candidates) {
    if (out.type !== "expense" || !out.accountId) continue;
    const into = candidates.find(
      (c) =>
        c.type === "income" &&
        c.accountId !== undefined &&
        c.accountId !== out.accountId &&
        !taken.has(c.externalId) &&
        sameMoment(out, c) &&
        sameMoney(out, c),
    );
    if (!into) continue;
    partnerOf.set(out.externalId, into);
    taken.add(into.externalId);
  }
  return candidates.flatMap((c): ImportCandidate[] => {
    if (taken.has(c.externalId)) return [];
    const into = partnerOf.get(c.externalId);
    if (!into) return [c];
    return [
      {
        ...c,
        type: "transfer",
        categoryId: "",
        toAccountId: into.accountId,
        toAmount: into.currency === c.currency ? undefined : into.amount,
        pairedId: into.externalId,
      },
    ];
  });
};

const CASH_MCC = new Set([6010, 6011]);

// Cash withdrawals turned into transfers to the cash account
export const cashWithdrawals = (state: AppState, candidates: ImportCandidate[]): ImportCandidate[] => {
  const cash = state.savings.filter((a) => a.kind === "cash");
  if (cash.length === 0) return candidates;
  return candidates.map((c) => {
    if (c.type !== "expense" || c.mcc === undefined || !CASH_MCC.has(c.mcc) || !c.accountId) return c;
    const same = cash.find((a) => a.currency === c.currency && a.id !== c.accountId);
    const foreign = cash.find((a) => a.currency === c.opCurrency && a.id !== c.accountId);
    const to = same ?? foreign;
    if (!to) return c;
    return {
      ...c,
      type: "transfer",
      categoryId: "",
      toAccountId: to.id,
      toAmount: to.currency === c.currency ? undefined : c.opAmount,
    };
  });
};

const PLAN_WINDOW_DAYS = 5;
const PLAN_TOLERANCE = 0.05;
const NAMED_TOLERANCE = 0.2;

// Operations matched to the planned entries they fulfil
export const matchPlanned = (state: AppState, candidates: ImportCandidate[]): ImportCandidate[] => {
  const planned = state.transactions.filter((t) => isPlaceholder(t) && !t.externalId && t.type !== "transfer");
  if (planned.length === 0) return candidates;
  const taken = new Set<string>();
  return candidates.map((c) => {
    if (c.type === "transfer" || c.duplicate) return c;
    const text = c.description.toLocaleLowerCase();
    let best: { tx: Transaction; score: number } | null = null;
    for (const tx of planned) {
      if (taken.has(tx.id) || tx.type !== c.type || tx.currency !== c.currency) continue;
      if (tx.accountId && c.accountId && tx.accountId !== c.accountId) continue;
      const days = Math.abs(Date.parse(tx.date) - Date.parse(c.date)) / DAY_MS;
      if (days > PLAN_WINDOW_DAYS) continue;
      const named = Boolean(tx.note && tx.note.length >= 3 && text.includes(tx.note.toLocaleLowerCase()));
      const drift = Math.abs(tx.amount - c.amount) / Math.max(tx.amount, 1);
      if (drift > (named ? NAMED_TOLERANCE : PLAN_TOLERANCE)) continue;
      const score = drift * 10 + days / PLAN_WINDOW_DAYS - (named ? 1 : 0);
      if (!best || score < best.score) best = { tx, score };
    }
    if (!best) return c;
    taken.add(best.tx.id);
    const category = state.categories.find((cat) => cat.id === best.tx.categoryId);
    return {
      ...c,
      categoryId: best.tx.categoryId,
      planned: { id: best.tx.id, label: best.tx.note?.trim() ? best.tx.note : (category?.name ?? "") },
    };
  });
};

// The name a rename rule gives a bank description, or nothing
export const renameOf = (state: AppState, description: string): string | undefined => {
  if (!description) return undefined;
  return state.rules.find((rule) => rule.rename !== undefined && ruleMatches(rule, description))?.rename;
};

// The entries to import as transactions of an account, named by the rename rules
export const toTransactions = (
  candidates: ImportCandidate[],
  accountId: string | undefined,
  makeId: () => string,
  nameOf?: (description: string) => string | undefined,
): Transaction[] => {
  return candidates.map((c) => {
    const renamed = nameOf?.(c.description);
    return {
      id: makeId(),
      type: c.type,
      amount: c.amount,
      currency: c.currency,
      categoryId: c.type === "transfer" ? "" : c.categoryId,
      date: c.date,
      note: renamed ?? (c.description || undefined),
      accountId: c.accountId ?? accountId,
      toAccountId: c.type === "transfer" ? c.toAccountId : undefined,
      toAmount: c.type === "transfer" ? c.toAmount : undefined,
      externalId: c.externalId,
      bank: bankLine(c, renamed ? c.description : undefined),
      unreviewed: true,
    };
  });
};

// What the bank said about an operation and its pair, its own words when renamed
const bankLine = (c: ImportCandidate, text?: string): Transaction["bank"] => {
  if (c.time === undefined && c.opAmount === undefined && c.pairedId === undefined && text === undefined) {
    return undefined;
  }
  const line: NonNullable<Transaction["bank"]> = {};
  if (text !== undefined) line.text = text;
  if (c.time !== undefined) line.time = c.time;
  if (c.opAmount !== undefined) {
    line.opAmount = c.opAmount;
    line.opCurrency = c.opCurrency;
  }
  if (c.pairedId !== undefined) line.pairedId = c.pairedId;
  return line;
};

// The state with the picked entries added and their plans settled
export const applyImport = (state: AppState, picked: ImportCandidate[], makeId: () => string): AppState => {
  const realOf = new Map(picked.flatMap((c) => (c.planned ? [[c.planned.id, c] as const] : [])));
  const transactions = state.transactions.map((tx) => {
    const real = realOf.get(tx.id);
    if (!real) return tx;
    return {
      ...tx,
      amount: real.amount,
      date: real.date,
      externalId: real.externalId,
      bank: bankLine(real),
      accountId: tx.accountId ?? real.accountId,
      note: tx.note ?? (real.description || undefined),
    };
  });
  const added = toTransactions(
    picked.filter((c) => !c.planned),
    undefined,
    makeId,
    (description) => renameOf(state, description),
  );
  return { ...state, transactions: [...transactions, ...added] };
};

// Entries found in a statement, paired, matched and marked
export const prepareImport = (state: AppState, found: ImportCandidate[]): ImportCandidate[] => {
  const shaped = cashWithdrawals(state, pairTransfers(found));
  return matchPlanned(state, markDuplicates(state, shaped)).toSorted((a, b) => b.date.localeCompare(a.date));
};

// A short stable hash of a text, for spotting the same operation
export const fingerprint = (text: string): string => {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x5bd1e995);
  }
  return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
};

export interface SubscriptionSuggestion {
  key: string;
  name: string;
  amount: number;
  currency: Currency;
  dayOfMonth: number;
  accountId?: string;
  months: number;
  startMonth: string;
}

// The words of a description that name the merchant
const merchantWords = (text: string): string => {
  return text
    .toLocaleLowerCase()
    .replaceAll(/[\d*#№.,:;!?'"«»()[\]{}\-_/\\]+/gu, " ")
    .replaceAll(/\s+/gu, " ")
    .trim();
};

// A merchant's name reduced to compare descriptions
export const merchantKey = (note: string): string => {
  return merchantWords(note).split(" ").slice(0, 3).join(" ");
};

// Whether a rule's words are in a description
export const ruleMatches = (rule: Pick<CategoryRule, "match">, description: string): boolean => {
  if (description.toLocaleLowerCase().includes(rule.match.toLocaleLowerCase())) return true;
  const words = merchantWords(rule.match);
  return words.length > 0 && merchantWords(description).includes(words);
};

export interface LearnedName {
  match: string;
  type: "income" | "expense";
  others: Transaction[];
}

// A rename to learn when a bank entry gets a new name, or null
export const learnedName = (state: AppState, tx: Transaction, note: string): LearnedName | null => {
  const original = tx.bank?.text ?? tx.note;
  const name = note.trim();
  if (!tx.externalId || tx.type === "transfer" || !original || name === "" || name === tx.note) return null;
  const match = merchantKey(original);
  if (match.length < 3) return null;
  const type = tx.type;
  const others = state.transactions.filter(
    (o) =>
      o.id !== tx.id &&
      o.type === type &&
      Boolean(o.externalId) &&
      o.note !== name &&
      merchantKey(o.bank?.text ?? o.note ?? "") === match,
  );
  return { match, type, others };
};

// The state with a merchant's new name kept as a rule and its entries renamed
export const applyLearnedName = (
  state: AppState,
  learned: LearnedName,
  name: string,
  categoryId: string,
  renameOthers: boolean,
  id: string,
): AppState => {
  const rename = name.trim().slice(0, 80);
  const existing = state.rules.find((r) => r.type === learned.type && r.match.toLocaleLowerCase() === learned.match);
  const rules = existing
    ? state.rules.map((r) => (r === existing ? { ...r, rename } : r))
    : [{ id, match: learned.match, categoryId, type: learned.type, rename }, ...state.rules];
  const moving = new Set(renameOthers ? learned.others.map((o) => o.id) : []);
  return {
    ...state,
    rules,
    transactions:
      moving.size > 0
        ? state.transactions.map((o) =>
            moving.has(o.id) ? { ...o, note: rename, bank: { ...o.bank, text: o.bank?.text ?? o.note } } : o,
          )
        : state.transactions,
  };
};

export interface LearnedRule {
  match: string;
  type: "income" | "expense";
  others: Transaction[];
}

// A rule to learn when a bank entry gets a new category, or null
export const learnedRule = (state: AppState, tx: Transaction, categoryId: string): LearnedRule | null => {
  const note = tx.note;
  if (!tx.externalId || tx.type === "transfer" || !note || tx.splitId || categoryId === tx.categoryId) return null;
  const match = merchantKey(note);
  if (match.length < 3) return null;
  const type = tx.type;
  const current = state.rules.find((r) => r.type === type && ruleMatches(r, note));
  if (current?.categoryId === categoryId) return null;
  const others = state.transactions.filter(
    (o) =>
      o.id !== tx.id &&
      o.type === type &&
      Boolean(o.externalId) &&
      !o.splitId &&
      o.categoryId !== categoryId &&
      merchantKey(o.note ?? "") === match,
  );
  return { match, type, others };
};

// An older rule's rename of the merchant, kept when the category changes
const renameKept = (state: AppState, learned: LearnedRule): { rename?: string } => {
  const rename = state.rules.find(
    (r) => r.type === learned.type && r.match.toLocaleLowerCase() === learned.match,
  )?.rename;
  return rename ? { rename } : {};
};

// The state with a learned rule kept and its other entries refiled
export const applyLearnedRule = (
  state: AppState,
  learned: LearnedRule,
  categoryId: string,
  moveOthers: boolean,
  id: string,
): AppState => {
  const moving = new Set(moveOthers ? learned.others.map((o) => o.id) : []);
  return {
    ...state,
    rules: [
      {
        id,
        match: learned.match,
        categoryId,
        type: learned.type,
        ...renameKept(state, learned),
      },
      ...state.rules.filter((r) => !(r.type === learned.type && r.match.toLocaleLowerCase() === learned.match)),
    ],
    transactions:
      moving.size > 0
        ? state.transactions.map((o) => (moving.has(o.id) ? { ...o, categoryId } : o))
        : state.transactions,
  };
};

// How many of the last months follow one another without a gap
const monthsInARow = (months: readonly string[]): number => {
  let run = 1;
  for (let index = months.length - 1; index > 0; index--) {
    const before = months[index - 1];
    const month = months[index];
    if (!before || !month || monthDiff(before, month) !== 1) break;
    run++;
  }
  return run;
};

// Monthly charges that look like subscriptions not tracked yet
export const suggestSubscriptions = (state: AppState, today: string): SubscriptionSuggestion[] => {
  const since = addMonths(monthOf(today), -6);
  const known = state.subscriptions.map((s) => s.name.toLocaleLowerCase()).filter((n) => n.length >= 3);
  const groups = new Map<string, Transaction[]>();
  for (const tx of state.transactions) {
    if (tx.type !== "expense" || tx.recurringId || tx.subscriptionId || tx.date > today || monthOf(tx.date) < since)
      continue;
    if (looksLikeBill(state.categories.find((category) => category.id === tx.categoryId))) continue;
    const note = tx.note?.trim();
    if (!note) continue;
    const key = merchantKey(note);
    if (key.length < 3) continue;
    const lower = note.toLocaleLowerCase();
    if (known.some((name) => lower.includes(name) || name.includes(key))) continue;
    const list = groups.get(key);
    if (list) list.push(tx);
    else groups.set(key, [tx]);
  }

  const out: SubscriptionSuggestion[] = [];
  for (const [key, txs] of groups) {
    const byMonth = new Map<string, Transaction>();
    for (const tx of txs.toSorted((a, b) => a.date.localeCompare(b.date))) byMonth.set(monthOf(tx.date), tx);
    const months = [...byMonth.keys()].toSorted();
    const run = monthsInARow(months);
    if (run < 2) continue;
    const recent = months.slice(-run).flatMap((month) => {
      const tx = byMonth.get(month);
      return tx ? [tx] : [];
    });
    const last = recent.at(-1);
    const firstMonth = months.at(-run);
    if (!last?.note || !firstMonth) continue;
    if (txs.filter((tx) => monthOf(tx.date) >= firstMonth).length > run) continue;
    if (recent.some((tx) => tx.currency !== last.currency)) continue;
    if (recent.some((tx) => Math.abs(tx.amount - last.amount) > last.amount * 0.1)) continue;
    const lastDay = Number(last.date.slice(8));
    if (recent.some((tx) => Math.abs(Number(tx.date.slice(8)) - lastDay) > 4)) continue;
    out.push({
      key,
      name: last.note.trim().slice(0, 60),
      amount: last.amount,
      currency: last.currency,
      dayOfMonth: lastDay,
      accountId: last.accountId,
      months: run,
      startMonth: addMonths(monthOf(last.date), 1),
    });
  }
  return out.toSorted((a, b) => b.months - a.months || b.amount - a.amount);
};

export interface MonoLine {
  id: string;
  time: number;
  description: string;
  comment?: string;
  mcc: number;
  amount: number;
  opAmount?: number;
  opCurrency?: Currency;
}

// A Monobank operation as an entry to import
export const candidateFromMono = (
  state: AppState,
  line: MonoLine,
  currency: Currency,
  accountId: string | undefined,
  date: string,
): ImportCandidate => {
  const type = line.amount < 0 ? "expense" : "income";
  const description = [line.description, line.comment].filter(Boolean).join(" · ");
  const foreign = line.opCurrency !== undefined && line.opCurrency !== currency;
  return {
    externalId: `mono:${line.id}`,
    date,
    time: line.time,
    type,
    amount: Math.abs(line.amount),
    currency,
    opAmount: foreign ? line.opAmount : undefined,
    opCurrency: foreign ? line.opCurrency : undefined,
    description,
    mcc: line.mcc || undefined,
    categoryId: suggestCategory(state, description, type, line.mcc || undefined),
    duplicate: false,
    accountId,
  };
};

// A stored entry as an import candidate, to compare with new ones
const asCandidate = (tx: Transaction): ImportCandidate => {
  return {
    externalId: tx.externalId ?? tx.id,
    date: tx.date,
    time: tx.bank?.time,
    type: tx.type,
    amount: tx.amount,
    currency: tx.currency,
    opAmount: tx.bank?.opAmount,
    opCurrency: tx.bank?.opCurrency,
    description: tx.note ?? "",
    categoryId: tx.categoryId,
    duplicate: false,
    accountId: tx.accountId,
  };
};

// The state with a bank operation merged into the entry it confirms
export const absorbOperation = (state: AppState, line: ImportCandidate, makeId: () => string): AppState => {
  if (knownOperations(state).has(line.externalId)) return state;

  // A typed or scanned entry takes the bank's mark and keeps its own words
  const typed = line.type === "transfer" ? undefined : state.transactions.find((tx) => typedFor(tx, line));
  if (typed) {
    return {
      ...state,
      transactions: state.transactions.map((tx) =>
        tx.id === typed.id
          ? { ...tx, externalId: line.externalId, bank: bankLine(line), accountId: tx.accountId ?? line.accountId }
          : tx,
      ),
    };
  }

  if (line.type !== "transfer" && line.accountId) {
    for (const tx of state.transactions) {
      if (!tx.externalId?.startsWith("mono:") || tx.recurringId || tx.subscriptionId) continue;
      if (tx.type === "transfer" || tx.type === line.type) continue;
      const other = asCandidate(tx);
      const pair = pairTransfers(line.type === "expense" ? [line, other] : [other, line]);
      const [transfer] = pair;
      if (pair.length !== 1 || !transfer) continue;
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === tx.id
            ? {
                ...t,
                type: "transfer" as const,
                categoryId: "",
                accountId: transfer.accountId,
                toAccountId: transfer.toAccountId,
                amount: transfer.amount,
                currency: transfer.currency,
                toAmount: transfer.toAmount,
                note: t.note ?? (line.description || undefined),
                bank: { ...t.bank, pairedId: line.externalId },
                tax: undefined,
                breakdown: undefined,
                unreviewed: true,
              }
            : t,
        ),
      };
    }
  }

  return applyImport(state, matchPlanned(state, cashWithdrawals(state, [line])).slice(0, 1), makeId);
};
