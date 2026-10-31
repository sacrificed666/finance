import { BANKABLE_KINDS, BRANDS } from "@/features/accounts/model/brands";
import { COINS } from "@/features/accounts/model/coins";
import { CUSTOM_GAME_ID, GAMES } from "@/features/accounts/model/games";
import { normalizeDashboard } from "@/features/dashboard/model/layout";
import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type {
  AppState,
  Budget,
  Category,
  CategoryRule,
  CoinHolding,
  Debt,
  Frequency,
  Goal,
  IncomeBreakdown,
  Investment,
  NetWorthSnapshot,
  PlannedEvent,
  Receivable,
  SavedView,
  RecurringRule,
  SavingsAccount,
  Settings,
  Subscription,
  TaxProfile,
  TaxRegimeId,
  Transaction,
  WishItem,
  WishPriority,
} from "@/features/data/model/types";
import {
  DEFAULT_TAX_PROFILE,
  ESV_MIN_UAH,
  profileFromRegime,
  taxRegime,
  TAX_REGIMES,
} from "@/features/income/model/tax";
import { INZHUR_FUNDS } from "@/features/investments/model/inzhur";
import { valuationOf } from "@/features/investments/model/kinds";
import { returnPolicy } from "@/features/investments/model/returns";
import { normalizeMonthRates } from "@/features/market/model/monthRates";
import { LOCALES, type Locale } from "@/shared/i18n/locales";
import { todayISO } from "@/shared/lib/date";
import { isRecord, type UnknownRecord } from "@/shared/lib/guards";
import type { Currency } from "@/shared/lib/money";

const CURRENCY_SET = new Set<unknown>(["UAH", "USD", "EUR"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/u;
const MONTH_RE = /^\d{4}-\d{2}$/u;
const HTTPS_URL_RE = /^https:\/\/[^\s"<>]{3,480}$/u;
const COIN_ICON_RE = /^https:\/\/[\w.-]*coingecko\.com\//u;

// Whether a value is a currency the app keeps
const isCurrency = (v: unknown): v is Currency => CURRENCY_SET.has(v);

// Whether a value is a finite number
const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// Whether a value is a string with something in it
const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.length > 0;

// Whether a value is a date as 2026-04-15
const isDate = (v: unknown): v is string => typeof v === "string" && DATE_RE.test(v);

// Whether a value is a month as 2026-04
const isMonth = (v: unknown): v is string => typeof v === "string" && MONTH_RE.test(v);

// A list, or an empty one for anything else
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

// Trimmed text cut to a length, or undefined when nothing is left
const cleanText = (v: unknown, max: number): string | undefined => {
  if (typeof v !== "string") return undefined;
  const text = v.trim().slice(0, max);
  return text.length > 0 ? text : undefined;
};

// A rate when it is a positive number, or the default one
const rateOr = (v: unknown, fallback: number): number => (isFiniteNumber(v) && v > 0 ? v : fallback);

// The notifications turned off and the summary asked for, if any
const normalizeNotify = (v: unknown): Settings["notify"] => {
  if (!isRecord(v)) return undefined;
  const operations = v.operations === false ? false : undefined;
  const budgets = v.budgets === false ? false : undefined;
  const summary = v.summary === "weekly" || v.summary === "monthly" ? v.summary : undefined;
  if (operations === undefined && budgets === undefined && summary === undefined) return undefined;
  return { operations, budgets, ...(summary ? { summary } : {}) };
};

// Up to eight tags without "#" and repeats in any case, each up to 24 characters
export const normalizeTags = (v: unknown): string[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of v) {
    const tag = cleanText(raw, 24)?.replace(/^#/u, "");
    if (!tag || seen.has(tag.toLocaleLowerCase())) continue;
    seen.add(tag.toLocaleLowerCase());
    out.push(tag);
    if (out.length === 8) break;
  }
  return out.length > 0 ? out : undefined;
};

const VIEW_KINDS: ReadonlyArray<SavedView["kind"]> = ["all", "expense", "income", "transfer"];
const VIEW_SCOPES: ReadonlyArray<SavedView["scope"]> = ["month", "quarter", "year", "all"];
const VIEW_TIMINGS: ReadonlyArray<SavedView["timing"]> = ["all", "posted", "planned"];

// The choice a value names from a list, or nothing
const pick = <T extends string>(choices: readonly T[], value: unknown): T | undefined =>
  choices.find((choice) => choice === value);

// The ledger searches kept under a name, a dozen at most
const normalizeViews = (v: unknown): SavedView[] | undefined => {
  const views = asArray(v).flatMap((view): SavedView[] => {
    if (!isRecord(view) || !isNonEmptyString(view.id)) return [];
    const name = cleanText(view.name, 40);
    const kind = pick(VIEW_KINDS, view.kind);
    const scope = pick(VIEW_SCOPES, view.scope);
    const timing = pick(VIEW_TIMINGS, view.timing);
    if (!name || !kind || !scope || !timing) return [];
    return [
      {
        id: view.id,
        name,
        kind,
        scope,
        query: cleanText(view.query, 80) ?? "",
        categoryId: typeof view.categoryId === "string" ? view.categoryId : "",
        accountId: typeof view.accountId === "string" ? view.accountId : "",
        tag: typeof view.tag === "string" ? view.tag.slice(0, 24) : "",
        timing,
      },
    ];
  });
  return views.length > 0 ? views.slice(-12) : undefined;
};

// What was moved into a budget month by month, the last two years at most
const normalizeMoved = (v: unknown): Record<string, number> | undefined => {
  if (!isRecord(v)) return undefined;
  const months = Object.entries(v)
    .filter((entry): entry is [string, number] => isMonth(entry[0]) && isFiniteNumber(entry[1]) && entry[1] !== 0)
    .toSorted(([a], [b]) => a.localeCompare(b))
    .slice(-24);
  return months.length > 0 ? Object.fromEntries(months) : undefined;
};

// The rules that file an entry by a word in its note
const normalizeRules = (v: unknown): CategoryRule[] =>
  asArray(v).flatMap((r): CategoryRule[] => {
    if (!isRecord(r) || !isNonEmptyString(r.id) || !isNonEmptyString(r.categoryId)) return [];
    const match = cleanText(r.match, 80);
    if (!match) return [];
    const rename = cleanText(r.rename, 80);
    const rule: CategoryRule = {
      id: r.id,
      match,
      categoryId: r.categoryId,
      type: r.type === "income" ? "income" : "expense",
    };
    return [rename ? { ...rule, rename } : rule];
  });

// The money lent out, with what came back held between nothing and the whole
const normalizeReceivables = (v: unknown): Receivable[] =>
  asArray(v).flatMap((r): Receivable[] => {
    if (!isRecord(r) || !isNonEmptyString(r.id) || !isCurrency(r.currency)) return [];
    const name = cleanText(r.name, 80);
    if (!name || !isFiniteNumber(r.amount) || r.amount <= 0 || !isDate(r.date)) return [];
    const repaid = isFiniteNumber(r.repaid) ? Math.min(Math.max(0, r.repaid), r.amount) : 0;
    return [
      {
        id: r.id,
        name,
        icon: typeof r.icon === "string" ? r.icon.slice(0, 16) : "🤝",
        amount: r.amount,
        currency: r.currency,
        date: r.date,
        dueDate: isDate(r.dueDate) ? r.dueDate : undefined,
        repaid,
        note: cleanText(r.note, 300),
        ...(isNonEmptyString(r.entryId) ? { entryId: r.entryId.slice(0, 60) } : {}),
      },
    ];
  });

// Whether a value is a wish's priority
const isPriority = (v: unknown): v is WishPriority => v === "high" || v === "normal" || v === "low";

// The wishes with a name and a price, links only over https
const normalizeWishlist = (v: unknown): WishItem[] =>
  asArray(v).flatMap((w): WishItem[] => {
    if (!isRecord(w) || !isNonEmptyString(w.id) || !isCurrency(w.currency)) return [];
    const name = cleanText(w.name, 80);
    if (!name || !isFiniteNumber(w.price) || w.price <= 0) return [];
    return [
      {
        id: w.id,
        name,
        icon: typeof w.icon === "string" ? w.icon.slice(0, 16) : "🎁",
        price: w.price,
        currency: w.currency,
        priority: isPriority(w.priority) ? w.priority : "normal",
        url: typeof w.url === "string" && HTTPS_URL_RE.test(w.url) ? w.url : undefined,
        note: cleanText(w.note, 300),
        month: isMonth(w.month) ? w.month : undefined,
        createdAt: isDate(w.createdAt) ? w.createdAt : todayISO(),
      },
    ];
  });

// The goals money is put aside for, the accounts they count kept once each
export const normalizeGoals = (v: unknown): Goal[] =>
  asArray(v).flatMap((g): Goal[] => {
    if (!isRecord(g) || !isNonEmptyString(g.id) || !isCurrency(g.currency)) return [];
    const name = cleanText(g.name, 80);
    if (!name || !isFiniteNumber(g.target) || g.target <= 0) return [];
    const accountIds = [...new Set(asArray(g.accountIds).filter(isNonEmptyString))].slice(0, 20);
    return [
      {
        id: g.id,
        name,
        icon: typeof g.icon === "string" && g.icon !== "" ? g.icon.slice(0, 16) : "🎯",
        target: g.target,
        currency: g.currency,
        saved: isFiniteNumber(g.saved) ? Math.max(0, g.saved) : 0,
        ...(isDate(g.deadline) ? { deadline: g.deadline } : {}),
        ...(accountIds.length > 0 ? { accountIds } : {}),
      },
    ];
  });

// The one-off sums planned for coming months
export const normalizePlannedEvents = (v: unknown): PlannedEvent[] =>
  asArray(v).flatMap((e): PlannedEvent[] => {
    if (!isRecord(e) || !isNonEmptyString(e.id) || !isCurrency(e.currency)) return [];
    if (!isMonth(e.month) || !isFiniteNumber(e.amount) || e.amount === 0) return [];
    return [{ id: e.id, month: e.month, amount: e.amount, currency: e.currency, note: cleanText(e.note, 120) ?? "" }];
  });

// One net worth snapshot a day, the last of a day winning, in date order
const normalizeSnapshots = (v: unknown): NetWorthSnapshot[] => {
  const byDate = new Map<string, NetWorthSnapshot>();
  for (const s of asArray(v)) {
    if (!isRecord(s) || !isDate(s.date)) continue;
    const { total, savings, investments, debts } = s;
    const receivables = s.receivables ?? 0;
    if (!isFiniteNumber(total) || !isFiniteNumber(savings) || !isFiniteNumber(investments)) continue;
    if (!isFiniteNumber(debts) || !isFiniteNumber(receivables)) continue;
    const rates = isRecord(s.rates) ? s.rates : {};
    byDate.set(s.date, {
      date: s.date,
      total,
      savings,
      investments,
      debts,
      receivables,
      rates: {
        USD: rateOr(rates.USD, DEFAULT_STATE.settings.rates.USD),
        EUR: rateOr(rates.EUR, DEFAULT_STATE.settings.rates.EUR),
      },
    });
  }
  return [...byDate.values()].toSorted((a, b) => a.date.localeCompare(b.date));
};

// Which account each bank card books into
const normalizeBankLinks = (v: unknown): Record<string, string> | undefined => {
  if (!isRecord(v)) return undefined;
  const out: Record<string, string> = {};
  for (const [bankId, accountId] of Object.entries(v)) {
    if (/^[\w-]{1,80}$/u.test(bankId) && typeof accountId === "string" && accountId.length <= 80)
      out[bankId] = accountId;
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

// The tax deadlines marked paid and when
const normalizeTaxPaid = (v: unknown): Record<string, string> | undefined => {
  if (!isRecord(v)) return undefined;
  const out: Record<string, string> = {};
  for (const [key, date] of Object.entries(v)) {
    if (key.length <= 60 && isDate(date)) out[key] = date;
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

// Whether a value is a bank's positive buy and sell rates
const isBuySell = (v: unknown): v is { buy: number; sell: number } =>
  isRecord(v) && isFiniteNumber(v.buy) && v.buy > 0 && isFiniteNumber(v.sell) && v.sell > 0;

// Whether a value is the bank's buy and sell rates for the currencies it has
const isRatesMeta = (v: unknown): v is NonNullable<AppState["settings"]["ratesMeta"]> =>
  isRecord(v) && (v.USD === undefined || isBuySell(v.USD)) && (v.EUR === undefined || isBuySell(v.EUR));

const LOCALE_SET = new Set<unknown>(LOCALES);

// Whether a value is a language of the app
const isLocale = (v: unknown): v is Locale => LOCALE_SET.has(v);

const REGIME_SET = new Set<unknown>(TAX_REGIMES.map((r) => r.id));

// Whether a value is a tax regime the app knows
const isRegime = (v: unknown): v is TaxRegimeId => REGIME_SET.has(v);

// The rates every profile had before regimes: 6% and the least social contribution
const LEGACY_RATE_PCT = 6;

// The tax regime, with rates of its own only for the editable ones
const normalizeTaxProfile = (tax: UnknownRecord): TaxProfile => {
  const changedRates = isFiniteNumber(tax.ratePct) && (tax.ratePct !== LEGACY_RATE_PCT || tax.fixedUAH !== ESV_MIN_UAH);
  const fallback: TaxRegimeId = changedRates ? "custom" : DEFAULT_TAX_PROFILE.regime;
  const regimeId: TaxRegimeId = isRegime(tax.regime) ? tax.regime : fallback;
  const regime = taxRegime(regimeId);
  const esv = typeof tax.esv === "boolean" ? tax.esv : true;
  if (!regime.editable) return profileFromRegime(regimeId, { esv });
  return {
    regime: regimeId,
    ratePct: isFiniteNumber(tax.ratePct) && tax.ratePct >= 0 && tax.ratePct < 100 ? tax.ratePct : regime.ratePct,
    fixedUAH: isFiniteNumber(tax.fixedUAH) && tax.fixedUAH >= 0 ? tax.fixedUAH : regime.fixedUAH,
    vatPct: isFiniteNumber(tax.vatPct) && tax.vatPct >= 0 && tax.vatPct < 100 ? tax.vatPct : 0,
    label: typeof tax.label === "string" ? tax.label.slice(0, 60) : "",
    esv,
  };
};

// Categories with a parent only when it is a top category of the same kind
const normalizeCategoryTree = (categories: Category[]): Category[] => {
  const byId = new Map(categories.map((c) => [c.id, c]));
  return categories.map((c) => {
    if (!c.parentId) return c;
    const parent = byId.get(c.parentId);
    const valid = parent !== undefined && parent.id !== c.id && parent.kind === c.kind && !parent.parentId;
    if (valid) return c;
    const { parentId: _parentId, ...rest } = c;
    return rest;
  });
};

// The default categories' old Ukrainian names, to bring them to English keys
const LEGACY_CATEGORY_NAMES: Partial<Record<string, { uk: string; en: string }>> = {
  "cat-groceries": { uk: "Продукти", en: "Groceries" },
  "cat-cafe": { uk: "Кафе й ресторани", en: "Cafes & Restaurants" },
  "cat-transport": { uk: "Транспорт", en: "Transport" },
  "cat-housing": { uk: "Житло й комуналка", en: "Housing & Utilities" },
  "cat-health": { uk: "Здоровʼя", en: "Health" },
  "cat-fun": { uk: "Розваги", en: "Entertainment" },
  "cat-clothes": { uk: "Одяг", en: "Clothes" },
  "cat-subs": { uk: "Підписки", en: "Subscriptions" },
  "cat-education": { uk: "Освіта", en: "Education" },
  "cat-gifts-out": { uk: "Подарунки", en: "Gifts" },
  "cat-other-exp": { uk: "Інше", en: "Other" },
  "cat-salary": { uk: "Зарплата", en: "Salary" },
  "cat-freelance": { uk: "Фриланс", en: "Freelance" },
  "cat-interest": { uk: "Відсотки", en: "Interest" },
  "cat-gifts-in": { uk: "Подарунки", en: "Gifts" },
  "cat-other-inc": { uk: "Інше", en: "Other" },
};

// A default category still under its old Ukrainian name, renamed to English
const translateLegacyCategory = (cat: Category): Category => {
  const legacy = LEGACY_CATEGORY_NAMES[cat.id];
  return legacy && cat.name === legacy.uk ? { ...cat, name: legacy.en } : cat;
};

// Whether a value is a salary breakdown by days, rate and extras
const isIncomeBreakdown = (v: unknown): v is IncomeBreakdown =>
  isRecord(v) &&
  isFiniteNumber(v.days) &&
  v.days >= 0 &&
  isFiniteNumber(v.dailyRate) &&
  v.dailyRate >= 0 &&
  isFiniteNumber(v.premium) &&
  isFiniteNumber(v.compensations) &&
  isFiniteNumber(v.cutoffs);

// Whether a value is the tax kept from an income entry
const isIncomeTax = (v: unknown): v is NonNullable<Transaction["tax"]> =>
  isRecord(v) &&
  isFiniteNumber(v.ratePct) &&
  v.ratePct >= 0 &&
  isFiniteNumber(v.fixedUAH) &&
  v.fixedUAH >= 0 &&
  isFiniteNumber(v.gross) &&
  v.gross > 0 &&
  (v.regime === undefined || isRegime(v.regime)) &&
  (v.vatPct === undefined || (isFiniteNumber(v.vatPct) && v.vatPct >= 0 && v.vatPct < 100)) &&
  (v.label === undefined || typeof v.label === "string");

// Whether a value is an entry: transfers with two accounts, the rest a category
const isTransaction = (v: unknown): v is Transaction => {
  if (!isRecord(v)) return false;
  const isTransfer = v.type === "transfer";
  const linked = isTransfer
    ? isNonEmptyString(v.accountId) && isNonEmptyString(v.toAccountId) && v.accountId !== v.toAccountId
    : isNonEmptyString(v.categoryId);
  return (
    isNonEmptyString(v.id) &&
    (v.type === "income" || v.type === "expense" || isTransfer) &&
    isFiniteNumber(v.amount) &&
    v.amount > 0 &&
    isCurrency(v.currency) &&
    linked &&
    isDate(v.date) &&
    (v.accountId === undefined || isNonEmptyString(v.accountId)) &&
    (v.toAccountId === undefined || isNonEmptyString(v.toAccountId)) &&
    (v.toAmount === undefined || (isFiniteNumber(v.toAmount) && v.toAmount > 0)) &&
    (v.breakdown === undefined || isIncomeBreakdown(v.breakdown)) &&
    (v.tax === undefined || isIncomeTax(v.tax))
  );
};

// What the bank said of an entry: when, the sum in another currency, its pair
const normalizeBankLine = (v: unknown): Transaction["bank"] => {
  if (!isRecord(v)) return undefined;
  const time = isFiniteNumber(v.time) && v.time > 0 ? Math.round(v.time) : undefined;
  const opCurrency = isCurrency(v.opCurrency) ? v.opCurrency : undefined;
  const opAmount = opCurrency && isFiniteNumber(v.opAmount) && v.opAmount >= 0 ? v.opAmount : undefined;
  const pairedId = cleanText(v.pairedId, 120);
  const text = cleanText(v.text, 200);
  if (time === undefined && opAmount === undefined && pairedId === undefined && text === undefined) return undefined;
  const line: NonNullable<Transaction["bank"]> = {};
  if (time !== undefined) line.time = time;
  if (opAmount !== undefined) {
    line.opAmount = opAmount;
    line.opCurrency = opCurrency;
  }
  if (pairedId !== undefined) line.pairedId = pairedId;
  if (text !== undefined) line.text = text;
  return line;
};

// The fiscal receipt an entry was scanned from: register and receipt numbers
const normalizeReceipt = (v: unknown): Transaction["receipt"] =>
  isRecord(v) &&
  typeof v.fn === "string" &&
  /^\d{1,20}$/u.test(v.fn) &&
  typeof v.id === "string" &&
  /^[\w.-]{1,40}$/u.test(v.id)
    ? { fn: v.fn, id: v.id }
    : undefined;

// An entry with clean extras; transfers lose category, salary and tax fields
const normalizeTransaction = (raw: Transaction): Transaction => {
  const t: Transaction = {
    ...raw,
    tags: normalizeTags(raw.tags),
    externalId: cleanText(raw.externalId, 120),
    bank: normalizeBankLine(raw.bank),
    splitId: cleanText(raw.splitId, 60),
    attachmentIds: Array.isArray(raw.attachmentIds)
      ? raw.attachmentIds.filter((id): id is string => typeof id === "string" && /^[\w-]{1,60}$/u.test(id)).slice(0, 10)
      : undefined,
    excluded: raw.excluded === true && raw.type !== "transfer" ? true : undefined,
    unreviewed: raw.unreviewed === true ? true : undefined,
    receipt: normalizeReceipt(raw.receipt),
  };
  if (!t.attachmentIds?.length) delete t.attachmentIds;
  for (const key of ["tags", "externalId", "bank", "splitId", "excluded", "unreviewed", "receipt"] as const) {
    if (t[key] === undefined) delete t[key];
  }
  if (t.type !== "transfer") {
    const { toAccountId: _toAccountId, toAmount: _toAmount, ...rest } = t;
    return rest;
  }
  return { ...t, categoryId: "", toAmount: t.toAmount ?? t.amount, breakdown: undefined, tax: undefined };
};

// Salary breakdowns kept apart in old backups, moved onto their entries
const migrateLegacyIncomeEntries = (transactions: Transaction[], rawEntries: unknown): Transaction[] => {
  const byTxId = new Map<string, IncomeBreakdown>();
  for (const e of asArray(rawEntries)) {
    if (!isRecord(e) || !isNonEmptyString(e.transactionId) || !isIncomeBreakdown(e)) continue;
    byTxId.set(e.transactionId, {
      days: e.days,
      dailyRate: e.dailyRate,
      premium: e.premium,
      compensations: e.compensations,
      cutoffs: e.cutoffs,
    });
  }
  if (byTxId.size === 0) return transactions;
  return transactions.map((t) => {
    const breakdown = byTxId.get(t.id);
    return (t.breakdown ?? null) === null && breakdown ? { ...t, breakdown } : t;
  });
};

// Whether a value is a category of income or spending
const isCategory = (v: unknown): v is Category =>
  isRecord(v) &&
  isNonEmptyString(v.id) &&
  isNonEmptyString(v.name) &&
  typeof v.icon === "string" &&
  isFiniteNumber(v.colorSlot) &&
  (v.kind === "income" || v.kind === "expense") &&
  (v.parentId === undefined || isNonEmptyString(v.parentId));

// Whether a value is a recurring entry
const isRecurring = (v: unknown): v is RecurringRule =>
  isRecord(v) &&
  isNonEmptyString(v.id) &&
  (v.type === "income" || v.type === "expense") &&
  isFiniteNumber(v.amount) &&
  v.amount > 0 &&
  isCurrency(v.currency) &&
  isNonEmptyString(v.categoryId) &&
  isFiniteNumber(v.dayOfMonth) &&
  isMonth(v.startMonth);

// The months or weekly days a schedule leaves out, once each, in its span
const normalizeSkipped = (v: unknown, startMonth: string, endMonth?: string): string[] | undefined => {
  const slots = new Set(
    asArray(v).filter(
      (slot): slot is string =>
        (isMonth(slot) || isDate(slot)) &&
        slot.slice(0, 7) >= startMonth &&
        (!endMonth || slot.slice(0, 7) <= endMonth),
    ),
  );
  return slots.size > 0 ? [...slots].toSorted().slice(-240) : undefined;
};

const FREQUENCIES = new Set<unknown>(["weekly", "monthly", "quarterly", "yearly"]);

// Whether a value is how often a schedule books
const isFrequency = (v: unknown): v is Frequency => FREQUENCIES.has(v);

// Whether a value is an instalment plan: a total split into whole payments
const isInstalment = (v: unknown): v is NonNullable<RecurringRule["instalment"]> =>
  isRecord(v) &&
  isFiniteNumber(v.total) &&
  v.total > 0 &&
  Number.isInteger(v.count) &&
  typeof v.count === "number" &&
  v.count >= 2 &&
  v.count <= 120;

// A recurring rule with its own fields only
const normalizeRecurring = (r: RecurringRule): RecurringRule => {
  const endMonth = isMonth(r.endMonth) && r.endMonth >= r.startMonth ? r.endMonth : undefined;
  const rule: RecurringRule = {
    id: r.id,
    type: r.type,
    amount: r.amount,
    currency: r.currency,
    categoryId: r.categoryId,
    dayOfMonth: r.dayOfMonth,
    startMonth: r.startMonth,
  };
  const note = cleanText(r.note, 300);
  if (note) rule.note = note;
  if (isNonEmptyString(r.accountId)) rule.accountId = r.accountId;
  if (endMonth) rule.endMonth = endMonth;
  if (isFrequency(r.period) && r.period !== "monthly") rule.period = r.period;
  const skipped = normalizeSkipped(r.skipped, r.startMonth, endMonth);
  if (skipped) rule.skipped = skipped;
  if (r.type === "expense" && isInstalment(r.instalment)) {
    rule.instalment = { total: r.instalment.total, count: r.instalment.count };
  }
  return rule;
};

// A subscription with its own fields only, monthly unless it says otherwise
const normalizeSubscription = (s: Subscription): Subscription => {
  const subscription: Subscription = {
    id: s.id,
    name: s.name,
    icon: s.icon,
    price: s.price,
    currency: s.currency,
    period: isFrequency(s.period) ? s.period : "monthly",
    dayOfMonth: s.dayOfMonth,
    startMonth: s.startMonth,
    active: s.active,
  };
  if (isNonEmptyString(s.accountId)) subscription.accountId = s.accountId;
  if (s.endMonth) subscription.endMonth = s.endMonth;
  const skipped = normalizeSkipped(s.skipped, s.startMonth, s.endMonth);
  if (skipped) subscription.skipped = skipped;
  return subscription;
};

// Whether a value is a subscription paid weekly, monthly, quarterly or yearly
const isSubscription = (v: unknown): v is Subscription =>
  isRecord(v) &&
  isNonEmptyString(v.id) &&
  isNonEmptyString(v.name) &&
  typeof v.icon === "string" &&
  isFiniteNumber(v.price) &&
  v.price > 0 &&
  isCurrency(v.currency) &&
  (v.period === undefined || isFrequency(v.period)) &&
  isFiniteNumber(v.dayOfMonth) &&
  isMonth(v.startMonth) &&
  (v.endMonth === undefined || isMonth(v.endMonth)) &&
  typeof v.active === "boolean";

// Whether a value is an account's savings goal
const isGoal = (v: unknown): v is NonNullable<SavingsAccount["goal"]> =>
  isRecord(v) &&
  isFiniteNumber(v.target) &&
  v.target > 0 &&
  (v.deadline === undefined || typeof v.deadline === "string");

// Whether a value is an account; old ones have a balance, not an opening one
const isSavings = (v: unknown): v is SavingsAccount =>
  isRecord(v) &&
  isNonEmptyString(v.id) &&
  isNonEmptyString(v.name) &&
  typeof v.icon === "string" &&
  isCurrency(v.currency) &&
  (isFiniteNumber(v.openingBalance) || isFiniteNumber(v.balance)) &&
  (v.goal === undefined || isGoal(v.goal));

const ACCOUNT_KIND_SET = new Set<string>(["card", "cash", "savings", "wallet", "crypto", "skins", "other"]);
const GAME_ID_SET = new Set<string>([...GAMES.map((g) => g.id), CUSTOM_GAME_ID]);
const BANK_ID_SET = new Set<string>(BRANDS.map((b) => b.id));
const COIN_ID_SET = new Set<string>(COINS.map((c) => c.id));

// A wallet's coins, each once with a quantity, its price and a CoinGecko icon
const normalizeHoldings = (raw: unknown): CoinHolding[] | undefined => {
  if (!Array.isArray(raw)) return undefined;
  const seen = new Set<string>();
  const out: CoinHolding[] = [];
  for (const h of raw) {
    if (!isRecord(h) || typeof h.coin !== "string" || !COIN_ID_SET.has(h.coin) || seen.has(h.coin)) continue;
    if (!isFiniteNumber(h.quantity) || h.quantity < 0) continue;
    seen.add(h.coin);
    out.push({
      coin: h.coin,
      quantity: h.quantity,
      price: isFiniteNumber(h.price) && h.price > 0 ? h.price : undefined,
      icon: typeof h.icon === "string" && COIN_ICON_RE.test(h.icon) ? h.icon : undefined,
    });
  }
  return out.length > 0 ? out : undefined;
};

// An account with the fields of its kind only: games for skins, coins for crypto
const normalizeAccount = (v: SavingsAccount): SavingsAccount => {
  const legacy = "balance" in v ? v.balance : undefined;
  const fallback = isFiniteNumber(legacy) ? legacy : 0;
  const opening = isFiniteNumber(v.openingBalance) ? v.openingBalance : fallback;
  const kind = ACCOUNT_KIND_SET.has(v.kind) ? v.kind : "card";
  const game = kind === "skins" && typeof v.game === "string" && GAME_ID_SET.has(v.game) ? v.game : undefined;
  const custom = game === CUSTOM_GAME_ID;
  const gameName =
    custom && typeof v.gameName === "string" && v.gameName.trim() ? v.gameName.trim().slice(0, 60) : undefined;
  return {
    id: v.id,
    name: v.name,
    icon: v.icon,
    kind,
    game: custom && !gameName ? undefined : game,
    gameName,
    gameLogo:
      custom && gameName && typeof v.gameLogo === "string" && HTTPS_URL_RE.test(v.gameLogo) ? v.gameLogo : undefined,
    bank: BANKABLE_KINDS.has(kind) && typeof v.bank === "string" && BANK_ID_SET.has(v.bank) ? v.bank : undefined,
    currency: v.currency,
    openingBalance: opening,
    holdings: kind === "crypto" ? normalizeHoldings(v.holdings) : undefined,
    pricedAt: kind === "crypto" && typeof v.pricedAt === "string" ? v.pricedAt : undefined,
    goal: v.goal,
    ...(v.archived === true ? { archived: true } : {}),
    ...(kind === "card" && isRecord(v.credit) && isFiniteNumber(v.credit.limit) && v.credit.limit >= 0
      ? { credit: { limit: v.credit.limit } }
      : {}),
  };
};

// Whether a value is an investment with a start, a rate and a way to pay out
const isInvestment = (v: unknown): v is Investment =>
  isRecord(v) &&
  isNonEmptyString(v.id) &&
  isNonEmptyString(v.name) &&
  isCurrency(v.currency) &&
  isFiniteNumber(v.principal) &&
  v.principal > 0 &&
  isFiniteNumber(v.annualRatePct) &&
  v.annualRatePct >= 0 &&
  v.annualRatePct <= 200 &&
  isDate(v.startDate) &&
  (v.endDate === undefined || (isDate(v.endDate) && v.endDate >= v.startDate)) &&
  (v.compounding === "reinvest" || v.compounding === "payout") &&
  (v.compoundingFreq === "monthly" || v.compoundingFreq === "quarterly" || v.compoundingFreq === "annually") &&
  (v.monthlyContribution === undefined || (isFiniteNumber(v.monthlyContribution) && v.monthlyContribution >= 0));

const INVESTMENT_KIND_SET = new Set<string>(["deposit", "bonds", "reit", "inzhur", "stocks", "crypto", "other"]);
const INZHUR_FUND_SET = new Set<string>(INZHUR_FUNDS.map((f) => f.id));

// An investment with the fields of its kind and the return rules it allows
const normalizeInvestment = (v: Investment): Investment => {
  const kind: Investment["kind"] = INVESTMENT_KIND_SET.has(v.kind) ? v.kind : "deposit";
  const market = valuationOf(kind) === "market";
  const fund = kind === "inzhur" && typeof v.fund === "string" && INZHUR_FUND_SET.has(v.fund) ? v.fund : undefined;
  const policy = returnPolicy({ kind, fund, compounding: v.compounding, compoundingFreq: v.compoundingFreq });
  const priced = kind === "crypto" || kind === "inzhur";
  const marketValue = isFiniteNumber(v.marketValue) && v.marketValue >= 0 ? v.marketValue : v.principal;
  return {
    ...v,
    compounding: policy.compounding,
    compoundingFreq: policy.compoundingFreq,
    kind,
    annualRatePct:
      isFiniteNumber(v.annualRatePct) && v.annualRatePct >= 0 && v.annualRatePct <= 200 ? v.annualRatePct : 0,
    marketValue: market ? marketValue : undefined,
    coin: kind === "crypto" && isNonEmptyString(v.coin) ? v.coin : undefined,
    fund,
    quantity: priced && isFiniteNumber(v.quantity) && v.quantity >= 0 ? v.quantity : undefined,
    pricedAt: priced && typeof v.pricedAt === "string" ? v.pricedAt : undefined,
    coinIcon:
      kind === "crypto" && typeof v.coinIcon === "string" && COIN_ICON_RE.test(v.coinIcon) ? v.coinIcon : undefined,
  };
};

// Whether a value is a monthly budget for a category
const isBudget = (v: unknown): v is Budget =>
  isRecord(v) && isNonEmptyString(v.categoryId) && isFiniteNumber(v.limit) && v.limit > 0 && isCurrency(v.currency);

// Whether a value is a mortgage, loan or card debt
const isDebt = (v: unknown): v is Debt =>
  isRecord(v) &&
  isNonEmptyString(v.id) &&
  isNonEmptyString(v.name) &&
  typeof v.icon === "string" &&
  (v.kind === "mortgage" || v.kind === "loan" || v.kind === "card") &&
  isCurrency(v.currency) &&
  isFiniteNumber(v.balance) &&
  v.balance >= 0 &&
  (v.principal === undefined || (isFiniteNumber(v.principal) && v.principal >= 0)) &&
  (v.annualRatePct === undefined ||
    (isFiniteNumber(v.annualRatePct) && v.annualRatePct >= 0 && v.annualRatePct <= 200)) &&
  (v.monthlyPayment === undefined || (isFiniteNumber(v.monthlyPayment) && v.monthlyPayment >= 0));

// A debt with its optional figures only when they are above zero
const normalizeDebt = (v: Debt): Debt => ({
  id: v.id,
  name: v.name,
  icon: v.icon,
  kind: v.kind,
  currency: v.currency,
  balance: v.balance,
  principal: v.principal && v.principal > 0 ? v.principal : undefined,
  annualRatePct: v.annualRatePct && v.annualRatePct > 0 ? v.annualRatePct : undefined,
  monthlyPayment: v.monthlyPayment && v.monthlyPayment > 0 ? v.monthlyPayment : undefined,
  note: v.note?.trim() ? v.note : undefined,
});

// The settings with every field checked and the defaults for the rest
const normalizeSettings = (s: UnknownRecord): Settings => {
  const rates = isRecord(s.rates) ? s.rates : {};
  return {
    baseCurrency: isCurrency(s.baseCurrency) ? s.baseCurrency : "UAH",
    theme: s.theme === "light" || s.theme === "dark" ? s.theme : "system",
    locale: isLocale(s.locale) ? s.locale : DEFAULT_STATE.settings.locale,
    tax: normalizeTaxProfile(isRecord(s.tax) ? s.tax : {}),
    rates: {
      USD: rateOr(rates.USD, DEFAULT_STATE.settings.rates.USD),
      EUR: rateOr(rates.EUR, DEFAULT_STATE.settings.rates.EUR),
    },
    ratesMeta: isRatesMeta(s.ratesMeta) ? s.ratesMeta : undefined,
    ratesUpdatedAt: typeof s.ratesUpdatedAt === "string" ? s.ratesUpdatedAt : undefined,
    ratesSource: s.ratesSource === "nbu" || s.ratesSource === "monobank" ? s.ratesSource : "manual",
    taxPaid: normalizeTaxPaid(s.taxPaid),
    bankLinks: normalizeBankLinks(s.bankLinks),
    dashboard: normalizeDashboard(s.dashboard),
    monthRates: normalizeMonthRates(s.monthRates),
    notify: normalizeNotify(s.notify),
    ledgerViews: normalizeViews(s.ledgerViews),
    calendar:
      isRecord(s.calendar) &&
      Number.isInteger(s.calendar.feed) &&
      typeof s.calendar.feed === "number" &&
      s.calendar.feed > 0
        ? { feed: s.calendar.feed, on: s.calendar.on === true }
        : undefined,
  };
};

// A whole state from anything stored or imported, with every record checked
export const normalizeState = (raw: unknown): AppState => {
  if (!isRecord(raw)) return DEFAULT_STATE;

  const transactions = migrateLegacyIncomeEntries(
    asArray(raw.transactions).filter(isTransaction).map(normalizeTransaction),
    raw.incomeEntries,
  );
  const categories = normalizeCategoryTree(asArray(raw.categories).filter(isCategory).map(translateLegacyCategory));
  const subscriptions = asArray(raw.subscriptions).filter(isSubscription).map(normalizeSubscription);
  const budgets = asArray(raw.budgets)
    .filter(isBudget)
    .map((b): Budget => ({
      categoryId: b.categoryId,
      limit: b.limit,
      currency: b.currency,
      rollover: b.period !== "yearly" && b.rollover === true ? true : undefined,
      period: b.period === "yearly" ? "yearly" : undefined,
      moved: normalizeMoved(b.moved),
    }));

  return {
    version: 1,
    transactions,
    categories: categories.length > 0 ? categories : DEFAULT_STATE.categories,
    recurring: asArray(raw.recurring).filter(isRecurring).map(normalizeRecurring),
    subscriptions,
    savings: asArray(raw.savings).filter(isSavings).map(normalizeAccount),
    investments: asArray(raw.investments).filter(isInvestment).map(normalizeInvestment),
    budgets,
    debts: asArray(raw.debts).filter(isDebt).map(normalizeDebt),
    rules: normalizeRules(raw.rules),
    receivables: normalizeReceivables(raw.receivables),
    wishlist: normalizeWishlist(raw.wishlist),
    plannedEvents: normalizePlannedEvents(raw.plannedEvents),
    snapshots: normalizeSnapshots(raw.snapshots),
    goals: normalizeGoals(raw.goals),
    settings: normalizeSettings(isRecord(raw.settings) ? raw.settings : {}),
  };
};

// The state as a pretty JSON backup
export const exportBackup = (state: AppState): string => JSON.stringify(state, null, 2);

export type BackupProblem = "settings.data.notJson" | "settings.data.notBackup";

// The JSON of a text, or undefined when it is not JSON
const jsonOf = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

// A state from a backup file, or the message key of what is wrong with it
export const parseBackup = (text: string): AppState | BackupProblem => {
  const raw = jsonOf(text);
  if (raw === undefined) return "settings.data.notJson";
  if (!isRecord(raw) || !("version" in raw)) return "settings.data.notBackup";
  return normalizeState(raw);
};
