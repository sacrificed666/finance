import { holdingsValue } from "@/features/accounts/model/coins";
import { ACCOUNT_KINDS, accountColorSlot } from "@/features/accounts/model/kinds";
import { booksInMonth, perMonth } from "@/features/data/model/frequency";
import type {
  AppState,
  CategoryKind,
  Debt,
  IncomeBreakdown,
  Investment,
  SavingsAccount,
  Settings,
  Subscription,
  Transaction,
} from "@/features/data/model/types";
import { INVESTMENT_KINDS, investmentColorSlot, investmentKind, valuationOf } from "@/features/investments/model/kinds";
import { addMonths, dateInMonth, monthDiff, monthOf, wholeMonthsBetween, yearsBetween } from "@/shared/lib/date";
import { convert, ratesAt } from "@/shared/lib/money";
import type { Currency } from "@/shared/lib/money";

// How often each schedule compounds in a year
const FREQ_PER_YEAR = { monthly: 12, quarterly: 4, annually: 1 } as const;

export interface InvestmentSnapshot {
  invested: number;
  value: number;
  accrued: number;
  paidOut: number;
}

// What an investment holds on a date: market value, or interest reinvested or paid
export const investmentAt = (inv: Investment, atISO: string): InvestmentSnapshot => {
  if (valuationOf(inv.kind) === "market") {
    const value = inv.marketValue ?? inv.principal;
    return {
      invested: inv.principal,
      value,
      accrued: value - inv.principal,
      paidOut: 0,
    };
  }

  const asOf = inv.endDate && atISO > inv.endDate ? inv.endDate : atISO;
  const t = yearsBetween(inv.startDate, asOf);
  const r = inv.annualRatePct / 100;
  const f = FREQ_PER_YEAR[inv.compoundingFreq];
  const c = inv.monthlyContribution ?? 0;
  const n = wholeMonthsBetween(inv.startDate, asOf);
  const invested = inv.principal + c * n;

  if (t <= 0) return { invested: inv.principal, value: inv.principal, accrued: 0, paidOut: 0 };

  if (inv.compounding === "reinvest") {
    const growth = Math.pow(1 + r / f, f * t);
    const im = Math.pow(1 + r / f, f / 12) - 1;
    const contribFV = c === 0 || n === 0 ? 0 : im === 0 ? c * n : c * ((Math.pow(1 + im, n) - 1) / im);
    const value = inv.principal * growth + contribFV;
    return { invested, value, accrued: value - invested, paidOut: 0 };
  }

  const contribInterest = c * r * ((n * (n - 1)) / 2 / 12);
  const paidOut = inv.principal * r * t + contribInterest;
  return { invested, value: invested, accrued: 0, paidOut };
};

// An investment's value and payouts on a future date at its expected rate
export const projectedSnapshot = (
  inv: Investment,
  todayISO: string,
  atISO: string,
): { value: number; paidOut: number } => {
  if (valuationOf(inv.kind) !== "market") {
    const snap = investmentAt(inv, atISO);
    return { value: snap.value, paidOut: snap.paidOut };
  }

  const end = inv.endDate && atISO > inv.endDate ? inv.endDate : atISO;
  const known = investmentAt(inv, end).value;
  const years = Math.max(0, yearsBetween(todayISO, end));
  const months = wholeMonthsBetween(todayISO, end);
  const r = inv.annualRatePct / 100;
  const c = inv.monthlyContribution ?? 0;
  if (r === 0 && c === 0) return { value: known, paidOut: 0 };

  if (inv.compounding === "payout") {
    const value = known + c * months;
    const paidOut = known * r * years + c * r * ((months * (months - 1)) / 2 / 12);
    return { value, paidOut };
  }

  const grown = known * Math.pow(1 + r, years);
  if (c === 0) return { value: grown, paidOut: 0 };
  const im = Math.pow(1 + r, 1 / 12) - 1;
  const contribFV = im === 0 ? c * months : c * ((Math.pow(1 + im, months) - 1) / im);
  return { value: grown + contribFV, paidOut: 0 };
};

// An investment's value on a date in the base currency
export const investmentValueInBase = (inv: Investment, atISO: string, settings: Settings): number => {
  const snap = investmentAt(inv, atISO);
  return convert(snap.value, inv.currency, settings.baseCurrency, settings.rates);
};

export interface NetWorth {
  savings: number;
  investments: number;
  receivables: number;
  debts: number;
  assets: number;
  total: number;
}

// The money still owed back, in the base currency
export const receivablesTotal = (state: AppState): number => {
  const { settings } = state;
  return state.receivables.reduce(
    (sum, r) => sum + convert(Math.max(0, r.amount - r.repaid), r.currency, settings.baseCurrency, settings.rates),
    0,
  );
};

// Every debt's balance, in the base currency
export const debtsTotal = (state: AppState): number => {
  const { settings } = state;
  return state.debts.reduce((sum, d) => sum + convert(d.balance, d.currency, settings.baseCurrency, settings.rates), 0);
};

// An entry's amount in an account's currency, at the rates of its month
const inAccountCurrency = (tx: Transaction, amount: number, to: Currency, settings: Settings): number =>
  tx.currency === to ? amount : convert(amount, tx.currency, to, ratesAt(settings, tx.date));

// How an entry moves an account: out, in, both for a transfer, or not at all
const movement = (tx: Transaction, account: SavingsAccount, settings: Settings): number => {
  if (tx.type === "transfer") {
    const out = tx.accountId === account.id ? -inAccountCurrency(tx, tx.amount, account.currency, settings) : 0;
    const into =
      tx.toAccountId === account.id ? (tx.toAmount ?? inAccountCurrency(tx, tx.amount, account.currency, settings)) : 0;
    return out + into;
  }
  if (tx.accountId !== account.id) return 0;
  const amount = inAccountCurrency(tx, tx.amount, account.currency, settings);
  return tx.type === "income" ? amount : -amount;
};

// An account's balance in its currency from its opening one and entries to a date
export const accountBalance = (
  account: SavingsAccount,
  transactions: Transaction[],
  settings: Settings,
  upToISO?: string,
): number => {
  let balance = account.openingBalance + holdingsValue(account.holdings);
  for (const tx of transactions) {
    if (upToISO && tx.date > upToISO) continue;
    balance += movement(tx, account, settings);
  }
  return balance;
};

// Every account's balance from the entries up to a date, each in its currency
export const accountBalances = (state: AppState, upToISO?: string): Map<string, number> => {
  const byId = new Map(state.savings.map((account) => [account.id, account]));
  const balances = new Map(state.savings.map((acc) => [acc.id, acc.openingBalance + holdingsValue(acc.holdings)]));
  // Moves an account's balance by what an entry does to it
  const move = (id: string | undefined, tx: Transaction) => {
    const account = id ? byId.get(id) : undefined;
    const current = account ? balances.get(account.id) : undefined;
    if (!account || current === undefined) return;
    balances.set(account.id, current + movement(tx, account, state.settings));
  };
  for (const tx of state.transactions) {
    if (upToISO && tx.date > upToISO) continue;
    move(tx.accountId, tx);
    if (tx.type === "transfer" && tx.toAccountId !== tx.accountId) move(tx.toAccountId, tx);
  }
  return balances;
};

// Savings, investments, money owed back and debts on a date
export const netWorth = (state: AppState, todayISO: string): NetWorth => {
  const { settings } = state;
  const balances = accountBalances(state, todayISO);
  const savings = state.savings.reduce(
    (sum, acc) => sum + convert(balances.get(acc.id) ?? 0, acc.currency, settings.baseCurrency, settings.rates),
    0,
  );
  const investments = state.investments.reduce((sum, inv) => sum + investmentValueInBase(inv, todayISO, settings), 0);
  const debts = debtsTotal(state);
  const receivables = receivablesTotal(state);
  const assets = savings + investments + receivables;
  return { savings, investments, receivables, debts, assets, total: assets - debts };
};

export interface ProjectionPoint {
  month: string;
  savings: number;
  investments: number;
  debt: number;
  total: number;
  net: number;
}

export interface ProjectionEvent {
  month: string;
  amount: number;
}

export interface ProjectionOptions {
  savingsReturnPct?: number;
  events?: ProjectionEvent[];
  includeDebts?: boolean;
  monthlySaving?: number;
  savingShift?: (month: string) => number;
}

// The debts' balance each month as payments bring it down
export const debtBalances = (state: AppState, horizonMonths: number): number[] => {
  const { settings } = state;
  const out = Array.from({ length: horizonMonths + 1 }, () => 0);
  for (const debt of state.debts) {
    const rate = (debt.annualRatePct ?? 0) / 100 / 12;
    const payment = debt.monthlyPayment ?? 0;
    let balance = debt.balance;
    for (let m = 0; m <= horizonMonths; m++) {
      out[m] = (out[m] ?? 0) + convert(Math.max(0, balance), debt.currency, settings.baseCurrency, settings.rates);
      if (payment > 0 && balance > 0) balance = Math.max(0, balance + balance * rate - payment);
    }
  }
  return out;
};

// Savings, investments and debts month by month into the future
export const buildProjection = (
  state: AppState,
  todayISO: string,
  horizonMonths: number,
  opts: ProjectionOptions,
): ProjectionPoint[] => {
  const { settings } = state;
  const startMonth = monthOf(todayISO);
  const day = Number(todayISO.slice(8, 10));
  const monthlyReturn = (opts.savingsReturnPct ?? 0) / 100 / 12;
  const eventsByMonth = new Map<string, number>();
  for (const event of opts.events ?? []) {
    eventsByMonth.set(event.month, (eventsByMonth.get(event.month) ?? 0) + event.amount);
  }
  const debts = opts.includeDebts ? debtBalances(state, horizonMonths) : null;

  const balancesNow = accountBalances(state, todayISO);
  const savingsNow =
    receivablesTotal(state) +
    state.savings.reduce(
      (sum, acc) => sum + convert(balancesNow.get(acc.id) ?? 0, acc.currency, settings.baseCurrency, settings.rates),
      0,
    );

  // The investments' value and payouts so far a number of months from now
  const investmentsAt = (m: number) => {
    const atISO = dateInMonth(addMonths(startMonth, m), day);
    let value = 0;
    let paidOut = 0;
    for (const inv of state.investments) {
      const snap = projectedSnapshot(inv, todayISO, atISO);
      value += convert(snap.value, inv.currency, settings.baseCurrency, settings.rates);
      paidOut += convert(snap.paidOut, inv.currency, settings.baseCurrency, settings.rates);
    }
    return { value, paidOut };
  };

  const first = investmentsAt(0);
  const firstDebt = debts?.[0] ?? 0;
  const points: ProjectionPoint[] = [
    {
      month: startMonth,
      savings: savingsNow,
      investments: first.value,
      debt: firstDebt,
      total: savingsNow + first.value,
      net: savingsNow + first.value - firstDebt,
    },
  ];

  let savings = savingsNow;
  let prevPaidOut = first.paidOut;
  for (let m = 1; m <= horizonMonths; m++) {
    const inv = investmentsAt(m);
    const month = addMonths(startMonth, m);
    const payoutInflow = Math.max(0, inv.paidOut - prevPaidOut);
    prevPaidOut = inv.paidOut;
    const saving = opts.monthlySaving === undefined ? 0 : opts.monthlySaving + (opts.savingShift?.(month) ?? 0);
    savings = savings * (1 + monthlyReturn) + payoutInflow + saving;
    savings += eventsByMonth.get(month) ?? 0;
    const debt = debts?.[m] ?? 0;
    points.push({
      month,
      savings,
      investments: inv.value,
      debt,
      total: savings + inv.value,
      net: savings + inv.value - debt,
    });
  }
  return points;
};

// Whether an entry counts as income or spending; a left-out one just moves money
export const counts = (tx: Transaction): boolean => tx.excluded !== true;

export interface MonthTotals {
  income: number;
  expense: number;
  net: number;
}

// A month's income, spending and net in the base currency
export const monthTotals = (transactions: Transaction[], month: string, settings: Settings): MonthTotals => {
  let income = 0;
  let expense = 0;
  for (const tx of transactions) {
    if (tx.type === "transfer" || !counts(tx) || monthOf(tx.date) !== month) continue;
    const v = convert(tx.amount, tx.currency, settings.baseCurrency, ratesAt(settings, tx.date));
    if (tx.type === "income") income += v;
    else expense += v;
  }
  return { income, expense, net: income - expense };
};

// The totals of each month up to one, oldest first
export const monthlySeries = (
  transactions: Transaction[],
  month: string,
  count: number,
  settings: Settings,
): Array<MonthTotals & { month: string }> => {
  const byMonth = new Map<string, MonthTotals & { month: string }>();
  for (let i = count - 1; i >= 0; i--) {
    const m = addMonths(month, -i);
    byMonth.set(m, { month: m, income: 0, expense: 0, net: 0 });
  }
  for (const tx of transactions) {
    if (tx.type === "transfer" || !counts(tx)) continue;
    const bucket = byMonth.get(monthOf(tx.date));
    if (!bucket) continue;
    const v = convert(tx.amount, tx.currency, settings.baseCurrency, ratesAt(settings, tx.date));
    if (tx.type === "income") bucket.income += v;
    else bucket.expense += v;
  }
  const result = [...byMonth.values()];
  for (const bucket of result) bucket.net = bucket.income - bucket.expense;
  return result;
};

// The months from the first income or expense, or one type of it, to a month
export const historyMonths = (transactions: Transaction[], month: string, type?: CategoryKind): number => {
  let first: string | null = null;
  for (const tx of transactions) {
    if (tx.type === "transfer" || (type && tx.type !== type)) continue;
    if (!first || tx.date < first) first = tx.date;
  }
  return first ? monthDiff(monthOf(first), month) + 1 : 0;
};

// A month's spending by category, the largest first
export const expensesByCategory = (
  transactions: Transaction[],
  month: string,
  settings: Settings,
): Map<string, number> => {
  const byCat = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== "expense" || !counts(tx) || monthOf(tx.date) !== month) continue;
    const v = convert(tx.amount, tx.currency, settings.baseCurrency, ratesAt(settings, tx.date));
    byCat.set(tx.categoryId, (byCat.get(tx.categoryId) ?? 0) + v);
  }
  return new Map([...byCat.entries()].toSorted((a, b) => b[1] - a[1]));
};

// What a category spent in a month, in a currency
export const spentInCategory = (
  transactions: Transaction[],
  categoryId: string,
  month: string,
  to: Currency,
  settings: Settings,
): number => {
  let sum = 0;
  for (const tx of transactions) {
    if (tx.type !== "expense" || !counts(tx)) continue;
    if (tx.categoryId !== categoryId || monthOf(tx.date) !== month) continue;
    sum += convert(tx.amount, tx.currency, to, ratesAt(settings, tx.date));
  }
  return sum;
};

// A salary breakdown's sum: days at the rate, extras and cutoffs
export const breakdownTotal = (b: IncomeBreakdown): number => {
  return b.days * b.dailyRate + b.premium + b.compensations - b.cutoffs;
};

// The income between two months by category, the largest first
export const incomeByCategory = (
  transactions: Transaction[],
  fromMonth: string,
  toMonth: string,
  settings: Settings,
): Map<string, number> => {
  const byCat = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== "income" || !counts(tx)) continue;
    const m = monthOf(tx.date);
    if (m < fromMonth || m > toMonth) continue;
    const v = convert(tx.amount, tx.currency, settings.baseCurrency, ratesAt(settings, tx.date));
    byCat.set(tx.categoryId, (byCat.get(tx.categoryId) ?? 0) + v);
  }
  return new Map([...byCat.entries()].toSorted((a, b) => b[1] - a[1]));
};

// A subscription's price per month, in a currency
export const subscriptionMonthlyCost = (sub: Subscription, to: Currency, settings: Settings): number => {
  return convert(perMonth(sub.price, sub.period), sub.currency, to, settings.rates);
};

// Whether a subscription runs in a month: switched on and within its span
export const subscriptionBillsIn = (sub: Subscription, month: string): boolean => {
  return sub.active && sub.startMonth <= month && (!sub.endMonth || sub.endMonth >= month);
};

// Whether a subscription charges in a month: on its step from the start month
export const subscriptionChargesIn = (sub: Subscription, month: string): boolean =>
  subscriptionBillsIn(sub, month) && booksInMonth(sub, month);

export type SubscriptionStatus = "active" | "upcoming" | "ended" | "paused";

// Whether a subscription is active, yet to start, ended or paused
export const subscriptionStatus = (sub: Subscription, month: string): SubscriptionStatus => {
  if (!sub.active) return "paused";
  if (sub.startMonth > month) return "upcoming";
  if (sub.endMonth && sub.endMonth < month) return "ended";
  return "active";
};

// What the active subscriptions cost a month, in a currency
export const subscriptionsMonthlyTotal = (subscriptions: Subscription[], to: Currency, settings: Settings): number => {
  return subscriptions.filter((s) => s.active).reduce((sum, s) => sum + subscriptionMonthlyCost(s, to, settings), 0);
};

export interface Holding {
  id: string;
  label: string;
  icon: string;
  currency: Currency;
  native: number;
  base: number;
  kind: "account" | "investment";
}

// Every account and investment with its value, own and in the base currency
export const holdings = (state: AppState, todayISO: string): Holding[] => {
  const { settings } = state;
  const balances = accountBalances(state, todayISO);
  // An archived account shows only while it still holds money
  const rows: Holding[] = state.savings.flatMap((acc) => {
    const native = balances.get(acc.id) ?? 0;
    if (acc.archived && Math.abs(native) < 0.005) return [];
    return [
      {
        id: acc.id,
        label: acc.name,
        icon: acc.icon,
        currency: acc.currency,
        native,
        base: convert(native, acc.currency, settings.baseCurrency, settings.rates),
        kind: "account" as const,
      },
    ];
  });
  for (const inv of state.investments) {
    const value = investmentAt(inv, todayISO).value;
    rows.push({
      id: inv.id,
      label: inv.name,
      icon: investmentKind(inv.kind).icon,
      currency: inv.currency,
      native: value,
      base: convert(value, inv.currency, settings.baseCurrency, settings.rates),
      kind: "investment",
    });
  }
  return rows;
};

export interface DebtPayoff {
  months: number;
  finalMonth: string;
  interest: number;
  neverPaysOff: boolean;
}

// When a debt is paid off at its payment and how much interest it costs
export const debtPayoff = (debt: Debt, fromMonth: string): DebtPayoff | null => {
  const payment = debt.monthlyPayment ?? 0;
  if (payment <= 0 || debt.balance <= 0) return null;
  const monthlyRate = (debt.annualRatePct ?? 0) / 100 / 12;
  const firstInterest = debt.balance * monthlyRate;
  if (payment <= firstInterest) {
    return { months: Infinity, finalMonth: "", interest: Infinity, neverPaysOff: true };
  }
  let balance = debt.balance;
  let interest = 0;
  let months = 0;
  while (balance > 0 && months < 1200) {
    const charge = balance * monthlyRate;
    interest += charge;
    balance = balance + charge - payment;
    months++;
  }
  return {
    months,
    finalMonth: addMonths(fromMonth, months - 1),
    interest,
    neverPaysOff: false,
  };
};

// The tax and VAT kept from income between two months, and the gross
export const taxPaid = (
  transactions: Transaction[],
  fromMonth: string,
  toMonth: string,
  settings: Settings,
): { tax: number; vat: number; gross: number; entries: number } => {
  let tax = 0;
  let vat = 0;
  let gross = 0;
  let entries = 0;
  const to = settings.baseCurrency;
  for (const tx of transactions) {
    if (tx.type !== "income" || !tx.tax) continue;
    const m = monthOf(tx.date);
    if (m < fromMonth || m > toMonth) continue;
    const vatPct = tx.tax.vatPct ?? 0;
    const vatNative = vatPct > 0 ? tx.tax.gross - tx.tax.gross / (1 + vatPct / 100) : 0;
    const deducted = tx.tax.gross - tx.amount;
    vat += convert(vatNative, tx.currency, to, ratesAt(settings, tx.date));
    tax += convert(deducted - vatNative, tx.currency, to, ratesAt(settings, tx.date));
    gross += convert(tx.tax.gross, tx.currency, to, ratesAt(settings, tx.date));
    entries++;
  }
  return { tax, vat, gross, entries };
};

// Assets by kind of account and investment, the largest first
export const netWorthByKind = (
  state: AppState,
  todayISO: string,
): Array<{ id: string; icon: string; base: number; colorSlot: number }> => {
  const { settings } = state;
  const balances = accountBalances(state, todayISO);

  const byKind = new Map<string, number>();
  for (const acc of state.savings) {
    const value = convert(balances.get(acc.id) ?? 0, acc.currency, settings.baseCurrency, settings.rates);
    byKind.set(`acc:${acc.kind}`, (byKind.get(`acc:${acc.kind}`) ?? 0) + value);
  }
  for (const inv of state.investments) {
    const value = investmentValueInBase(inv, todayISO, settings);
    byKind.set(`inv:${inv.kind}`, (byKind.get(`inv:${inv.kind}`) ?? 0) + value);
  }

  // A kind's row with what it holds
  const row = (id: string, icon: string, colorSlot: number) => ({ id, icon, colorSlot, base: byKind.get(id) ?? 0 });
  const rows = [
    ...ACCOUNT_KINDS.map((k) => row(`acc:${k.value}`, k.icon, accountColorSlot(k.value))),
    ...INVESTMENT_KINDS.map((k) => row(`inv:${k.value}`, k.icon, investmentColorSlot(k.value))),
  ];

  return rows.filter((r) => r.base > 0).toSorted((a, b) => b.base - a.base);
};

// Assets by currency, the largest first
export const currencyAllocation = (
  state: AppState,
  todayISO: string,
): Array<{ currency: Currency; native: number; base: number }> => {
  const byCurrency = new Map<Currency, { native: number; base: number }>();
  for (const h of holdings(state, todayISO)) {
    const entry = byCurrency.get(h.currency) ?? { native: 0, base: 0 };
    entry.native += h.native;
    entry.base += h.base;
    byCurrency.set(h.currency, entry);
  }
  return [...byCurrency.entries()]
    .map(([currency, v]) => ({ currency, native: v.native, base: v.base }))
    .toSorted((a, b) => b.base - a.base);
};

// Sums by category added up into their top categories, the largest first
export const rollupToParents = (
  byCategory: Map<string, number>,
  categories: Array<{ id: string; parentId?: string }>,
): Map<string, number> => {
  const parentOf = new Map(categories.map((c) => [c.id, c.parentId]));
  const out = new Map<string, number>();
  for (const [id, value] of byCategory) {
    const parent = parentOf.get(id);
    const key = parent && parentOf.has(parent) ? parent : id;
    out.set(key, (out.get(key) ?? 0) + value);
  }
  return new Map([...out.entries()].toSorted((a, b) => b[1] - a[1]));
};

// The average net of recent months with money moving
export const averageKept = (state: AppState, month: string, months = 6): number => {
  const series = monthlySeries(state.transactions, addMonths(month, -1), months, state.settings).filter(
    (m) => m.income > 0 || m.expense > 0,
  );
  return series.length > 0 ? series.reduce((sum, m) => sum + m.net, 0) / series.length : 0;
};
