import { holdingsValue } from "@/features/accounts/model/coins";
import { DEFAULT_CATEGORY_NAMES } from "@/features/data/model/defaults";
import {
  accountBalances,
  counts,
  debtPayoff,
  investmentAt,
  monthlySeries,
  netWorth,
  projectedSnapshot,
  spentInCategory,
  subscriptionMonthlyCost,
} from "@/features/data/model/finmath";
import type { AppState, InvestmentKind, Transaction } from "@/features/data/model/types";
import { valuationOf } from "@/features/investments/model/kinds";
import { monthlyBudgets } from "@/features/transactions/model/budgets";
import { addDays, addMonths, currentMonth, dateInMonth, monthDiff, monthOf, todayISO } from "@/shared/lib/date";
import { convert } from "@/shared/lib/money";
import type { Currency } from "@/shared/lib/money";

export type Tier = "bronze" | "silver" | "gold" | "platinum";

export type AchievementGroup = "start" | "tracking" | "budgets" | "savings" | "wealth" | "investing" | "mastery";

export const ACHIEVEMENT_GROUPS: AchievementGroup[] = [
  "start",
  "tracking",
  "budgets",
  "savings",
  "wealth",
  "investing",
  "mastery",
];

export const TIER_XP: Record<Tier, number> = { bronze: 50, silver: 150, gold: 400, platinum: 1000 };

export interface AchievementDef {
  id: string;
  icon: string;
  tier: Tier;
  group: AchievementGroup;
  xp: number;
}

export interface AchievementState extends AchievementDef {
  unlocked: boolean;
  current: number;
  target: number;
  progress: number;
}

const DEFS: Array<[id: string, icon: string, tier: Tier, group: AchievementGroup]> = [
  ["first-steps", "👣", "bronze", "start"],
  ["first-income", "💼", "bronze", "start"],
  ["account-opener", "🏦", "bronze", "start"],
  ["budgeter", "🎯", "bronze", "start"],
  ["goal-setter", "🚩", "bronze", "start"],
  ["categorizer", "🗂️", "bronze", "start"],
  ["scheduler", "🔁", "bronze", "start"],
  ["subscriber", "📺", "bronze", "start"],
  ["notetaker", "📝", "bronze", "start"],
  ["organizer", "🌿", "silver", "start"],

  ["bookkeeper", "📒", "silver", "tracking"],
  ["ledger-master", "📚", "gold", "tracking"],
  ["ledger-legend", "🗄️", "platinum", "tracking"],
  ["week-streak-4", "📅", "silver", "tracking"],
  ["week-streak-12", "🗓️", "gold", "tracking"],
  ["week-streak-26", "⏳", "platinum", "tracking"],
  ["daily-habit", "☀️", "silver", "tracking"],
  ["months-3", "🌱", "bronze", "tracking"],
  ["year-tracker", "📆", "gold", "tracking"],
  ["two-years", "🎂", "platinum", "tracking"],

  ["budget-architect", "🧭", "silver", "budgets"],
  ["budget-keeper", "🛡️", "silver", "budgets"],
  ["under-budget", "📉", "silver", "budgets"],
  ["budget-streak-3", "🧱", "gold", "budgets"],
  ["budget-streak-6", "🏯", "platinum", "budgets"],

  ["saver-10", "🪙", "bronze", "savings"],
  ["saver-20", "🐷", "gold", "savings"],
  ["saver-35", "🚀", "platinum", "savings"],
  ["streak-3", "🔥", "silver", "savings"],
  ["streak-6", "☄️", "gold", "savings"],
  ["streak-12", "🌋", "platinum", "savings"],
  ["frugal-month", "🥗", "silver", "savings"],
  ["emergency-1", "🩹", "bronze", "savings"],
  ["emergency-3", "🧯", "silver", "savings"],
  ["emergency-6", "🏰", "gold", "savings"],
  ["goal-halfway", "🏁", "silver", "savings"],
  ["goal-crusher", "🏆", "gold", "savings"],
  ["goal-collector", "🎖️", "platinum", "savings"],

  ["worth-10k", "🌰", "bronze", "wealth"],
  ["worth-100k", "💯", "silver", "wealth"],
  ["worth-500k", "💰", "gold", "wealth"],
  ["worth-1m", "💎", "platinum", "wealth"],
  ["worth-5m", "👑", "platinum", "wealth"],
  ["growing", "🌳", "silver", "wealth"],
  ["multi-currency", "💱", "silver", "wealth"],
  ["all-currencies", "🌍", "gold", "wealth"],
  ["debt-planner", "🗺️", "bronze", "wealth"],
  ["debt-crusher", "⛓️‍💥", "silver", "wealth"],
  ["debt-free", "🕊️", "gold", "wealth"],

  ["investor", "📈", "bronze", "investing"],
  ["depositor", "🔐", "bronze", "investing"],
  ["bondholder", "📜", "bronze", "investing"],
  ["inzhur-owner", "🏛️", "bronze", "investing"],
  ["crypto-holder", "🔗", "bronze", "investing"],
  ["gamer", "🎮", "bronze", "investing"],
  ["portfolio-5", "🗃️", "silver", "investing"],
  ["diversified", "🧺", "silver", "investing"],
  ["crypto-basket", "💠", "silver", "investing"],
  ["diversified-5", "🎨", "gold", "investing"],
  ["inzhur-trio", "🔱", "gold", "investing"],
  ["invested-25", "⚖️", "gold", "investing"],
  ["passive-income", "🌴", "gold", "investing"],
  ["passive-10k", "🏝️", "platinum", "investing"],

  ["tax-aware", "🧾", "bronze", "mastery"],
  ["tax-pro", "📑", "silver", "mastery"],
  ["subscription-auditor", "✂️", "bronze", "mastery"],
  ["lean-subs", "🧹", "silver", "mastery"],
  ["health-50", "💛", "silver", "mastery"],
  ["health-70", "💚", "gold", "mastery"],
  ["health-90", "💖", "platinum", "mastery"],
];

export const ACHIEVEMENTS: AchievementDef[] = DEFS.map(([id, icon, tier, group]) => ({
  id,
  icon,
  tier,
  group,
  xp: TIER_XP[tier],
}));

export interface FinanceFacts {
  transactions: number;
  manualTransactions: number;
  manualThisMonth: number;
  notedTransactions: number;
  incomeTransactions: number;
  subcategoryTransactions: number;
  firstMonth: string | null;
  monthsTracked: number;
  activeDays30: number;
  weekStreak: number;
  bestWeekStreak: number;
  activeWeeks: number;

  accounts: number;
  skinsAccounts: number;
  coins: number;
  investments: number;
  investmentKinds: number;
  inzhurFunds: number;
  hasBonds: boolean;
  hasDeposit: boolean;

  budgets: number;
  budgetsTrackedLastMonth: number;
  budgetsWithinLastMonth: number;
  budgetsKeptLastMonth: boolean;
  budgetUsageLastMonth: number;
  budgetStreak: number;
  budgetKeptMonths: number;

  goals: number;
  goalsReached: number;
  goalHalfway: boolean;
  customCategories: number;
  recurringRules: number;
  subscriptions: number;
  stoppedSubscriptions: number;
  subscriptionsMonthlyUAH: number;
  subsShareOfIncome: number;

  heldCurrencies: number;
  liquidUAH: number;
  semiLiquidUAH: number;
  avgExpenseUAH: number;
  avgIncomeUAH: number;
  avgIncomeMonths: number;
  avgExpenseMonths: number;
  emergencyMonths: number;
  netWorthUAH: number;
  netWorthGrowth6: number | null;
  netWorthChange6UAH: number | null;
  assetsUAH: number;
  debtsUAH: number;
  investedUAH: number;
  investedShare: number;
  assetClasses: number;
  largestClassShare: number;
  passiveMonthlyUAH: number;

  positiveStreak: number;
  bestStreak: number;
  positiveMonths: number;
  positiveMonths6: number;
  completeMonths6: number;
  frugalMonths: number;
  savingsRate3: number;
  savingsRatePrev3: number;
  expenseVolatility: number;
  topCategoryId: string | null;
  topCategoryShare: number;

  taxedIncomes: number;
  debts: number;
  debtWithPlan: number;
  debtPaidHalf: boolean;
  anyDebtGrowing: boolean;
  monthlyDebtPaymentUAH: number;
}

const SEMI_LIQUID: Set<InvestmentKind> = new Set(["deposit", "bonds", "reit", "inzhur", "stocks", "crypto"]);

// Whether an entry was typed in rather than posted by a schedule
const isManual = (tx: Transaction): boolean => {
  return !tx.recurringId && !tx.subscriptionId;
};

// The number of the Monday-to-Sunday week a day falls in
const weekIndex = (dateISO: string): number => {
  return Math.floor((Date.parse(`${dateISO}T00:00:00Z`) / 86_400_000 + 3) / 7);
};

// The average of some numbers, zero for none
const mean = (values: number[]): number => {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
};

// Everything the achievements, health and levels are judged on
export const financeFacts = (state: AppState): FinanceFacts => {
  const today = todayISO();
  const now = currentMonth();
  const lastMonth = addMonths(now, -1);
  const rates = state.settings.rates;
  // An amount in hryvnias at today's rates
  const toUAH = (amount: number, currency: Currency) => convert(amount, currency, "UAH", rates);

  const past = state.transactions.filter((tx) => tx.date <= today);
  const manual = past.filter(isManual);
  const firstDate = past.reduce<string | null>((min, tx) => (!min || tx.date < min ? tx.date : min), null);
  const firstMonth = firstDate ? monthOf(firstDate) : null;
  const monthsTracked = firstMonth ? monthDiff(firstMonth, now) + 1 : 0;

  const since30 = addDays(today, -29);
  const activeDays30 = new Set(manual.filter((tx) => tx.date >= since30).map((tx) => tx.date)).size;

  const weeks = new Set(manual.map((tx) => weekIndex(tx.date)));
  const thisWeek = weekIndex(today);
  let weekStreak = 0;
  for (let w = weeks.has(thisWeek) ? thisWeek : thisWeek - 1; weeks.has(w); w--) weekStreak++;
  let bestWeekStreak = 0;
  for (const w of weeks) {
    if (weeks.has(w - 1)) continue;
    let run = 0;
    while (weeks.has(w + run)) run++;
    bestWeekStreak = Math.max(bestWeekStreak, run);
  }

  const childIds = new Set(state.categories.filter((c) => c.parentId).map((c) => c.id));

  const balances = accountBalances(state, today);
  const heldCurrencies = new Set(state.savings.filter((a) => (balances.get(a.id) ?? 0) > 0).map((a) => a.currency));
  const liquidUAH = state.savings
    .filter((a) => a.kind !== "skins" && a.kind !== "crypto")
    .reduce((sum, a) => sum + Math.max(0, toUAH(balances.get(a.id) ?? 0, a.currency)), 0);
  const cryptoAccountsUAH = state.savings
    .filter((a) => a.kind === "crypto")
    .reduce((sum, a) => sum + Math.max(0, toUAH(balances.get(a.id) ?? 0, a.currency)), 0);
  const skinsUAH = state.savings
    .filter((a) => a.kind === "skins")
    .reduce((sum, a) => sum + Math.max(0, toUAH(balances.get(a.id) ?? 0, a.currency)), 0);

  const classValues = new Map<string, number>();
  // Counts some money towards a class of assets
  const addClass = (id: string, value: number) => {
    if (value > 0) classValues.set(id, (classValues.get(id) ?? 0) + value);
  };
  addClass("cash", liquidUAH);
  addClass("crypto", cryptoAccountsUAH);
  addClass("items", skinsUAH);

  let investedUAH = cryptoAccountsUAH;
  let semiLiquidUAH = cryptoAccountsUAH;
  let passiveYearUAH = 0;
  const oneYear = dateInMonth(addMonths(now, 12), Number(today.slice(8, 10)));
  for (const inv of state.investments) {
    const snap = investmentAt(inv, today);
    const value = toUAH(snap.value, inv.currency);
    investedUAH += value;
    if (SEMI_LIQUID.has(inv.kind)) semiLiquidUAH += value;
    addClass(inv.kind, value);
    const deposits = (inv.monthlyContribution ?? 0) * 12;
    const gain =
      valuationOf(inv.kind) === "market"
        ? (() => {
            const proj = projectedSnapshot(inv, today, oneYear);
            return proj.value - snap.value - deposits + proj.paidOut;
          })()
        : (() => {
            const ahead = investmentAt(inv, oneYear);
            return ahead.accrued + ahead.paidOut - (snap.accrued + snap.paidOut);
          })();
    if (inv.endDate === undefined || inv.endDate > today) passiveYearUAH += Math.max(0, toUAH(gain, inv.currency));
  }

  const coins = new Set<string>();
  for (const a of state.savings) for (const h of a.holdings ?? []) if (h.quantity > 0) coins.add(h.coin);
  for (const inv of state.investments)
    if (inv.kind === "crypto" && inv.coin && (inv.quantity ?? 0) > 0) coins.add(inv.coin);

  const uah = { ...state.settings, baseCurrency: "UAH" as const };
  const series = monthlySeries(state.transactions, lastMonth, 24, uah).filter(
    (m) => !firstMonth || m.month >= firstMonth,
  );
  const active = series.filter((m) => m.income > 0 || m.expense > 0);
  const last6 = active.slice(-6);
  const spendingMonths = last6.map((m) => m.expense).filter((v) => v > 0);
  const incomeMonths = last6.map((m) => m.income).filter((v) => v > 0);
  const avgExpenseUAH = mean(spendingMonths);
  const avgIncomeUAH = mean(incomeMonths);

  let positiveStreak = 0;
  for (const m of series.toReversed()) {
    if (m.income === 0 && m.expense === 0) break;
    if (m.net > 0) positiveStreak++;
    else break;
  }
  let bestStreak = 0;
  let run = 0;
  for (const m of series) {
    if (m.net > 0 && (m.income > 0 || m.expense > 0)) {
      run++;
      bestStreak = Math.max(bestStreak, run);
    } else run = 0;
  }

  // The share of income the months kept, in percent
  const rateOf = (months: typeof series) => {
    const withIncome = months.filter((m) => m.income > 0);
    const income = withIncome.reduce((s, m) => s + m.income, 0);
    return income > 0 ? (withIncome.reduce((s, m) => s + m.net, 0) / income) * 100 : 0;
  };
  const savingsRate3 = rateOf(active.slice(-3));
  const savingsRatePrev3 = rateOf(active.slice(-6, -3));
  const expenses6 = last6.map((m) => m.expense);
  const expenseMean = mean(expenses6);
  const expenseVolatility =
    expenses6.length > 1 && expenseMean > 0
      ? Math.sqrt(mean(expenses6.map((v) => (v - expenseMean) ** 2))) / expenseMean
      : 0;

  // Month by month achievements weigh the budgets with a monthly limit
  const monthly = monthlyBudgets(state);
  // A category with its subcategories
  const descendants = (id: string) => [id, ...state.categories.filter((c) => c.parentId === id).map((c) => c.id)];
  // Whether every budget held in a month
  const budgetKept = (month: string) =>
    monthly.every((b) => {
      const spent = descendants(b.categoryId).reduce(
        (s, id) => s + spentInCategory(state.transactions, id, month, b.currency, state.settings),
        0,
      );
      return spent <= b.limit;
    });
  let budgetsWithin = 0;
  let spentTotal = 0;
  let limitTotal = 0;
  for (const b of monthly) {
    const spent = descendants(b.categoryId).reduce(
      (s, id) => s + spentInCategory(state.transactions, id, lastMonth, b.currency, state.settings),
      0,
    );
    if (spent <= b.limit) budgetsWithin++;
    spentTotal += toUAH(spent, b.currency);
    limitTotal += toUAH(b.limit, b.currency);
  }
  let budgetStreak = 0;
  let budgetKeptMonths = 0;
  if (monthly.length > 0) {
    const tracked = new Set(active.map((m) => m.month));
    for (let i = 1; i <= 12; i++) {
      const month = addMonths(now, -i);
      if (!tracked.has(month)) break;
      if (budgetKept(month)) budgetStreak++;
      else break;
    }
    for (let i = 1; i <= 12; i++) {
      const month = addMonths(now, -i);
      if (tracked.has(month) && budgetKept(month)) budgetKeptMonths++;
    }
  }

  const expenseByCat = new Map<string, number>();
  const parentOf = new Map(state.categories.map((c) => [c.id, c.parentId ?? c.id]));
  const from3 = addMonths(now, -3);
  for (const tx of past) {
    if (tx.type !== "expense" || !counts(tx)) continue;
    const m = monthOf(tx.date);
    if (m < from3 || m > lastMonth) continue;
    const top = parentOf.get(tx.categoryId) ?? tx.categoryId;
    expenseByCat.set(top, (expenseByCat.get(top) ?? 0) + toUAH(tx.amount, tx.currency));
  }
  const expense3 = [...expenseByCat.values()].reduce((s, v) => s + v, 0);
  const topCategory = [...expenseByCat.entries()].toSorted((a, b) => b[1] - a[1])[0];

  const worth = netWorth(state, today);
  const assetsUAH = convert(worth.assets, state.settings.baseCurrency, "UAH", rates);
  const debtsUAH = convert(worth.debts, state.settings.baseCurrency, "UAH", rates);
  const netWorthUAH = assetsUAH - debtsUAH;

  const sixAgo = dateInMonth(addMonths(now, -6), Number(today.slice(8, 10)));
  let netWorthGrowth6: number | null = null;
  let netWorthChange6UAH: number | null = null;
  if (firstDate && firstDate <= sixAgo) {
    const then = accountBalances(state, sixAgo);
    const savingsThen = state.savings.reduce(
      (s, a) => s + toUAH((then.get(a.id) ?? 0) - holdingsValue(a.holdings), a.currency),
      0,
    );
    const investThen = state.investments
      .filter((inv) => inv.startDate <= sixAgo)
      .reduce((s, inv) => s + toUAH(investmentAt(inv, sixAgo).value, inv.currency), 0);
    const worthThen = savingsThen + investThen - debtsUAH;
    netWorthGrowth6 = worthThen > 0 ? ((netWorthUAH - worthThen) / worthThen) * 100 : null;
    netWorthChange6UAH = netWorthUAH - worthThen;
  }

  const monthIncomeUAH = avgIncomeUAH;
  const subscriptionsMonthlyUAH = state.subscriptions
    .filter((s) => s.active && (!s.endMonth || s.endMonth >= now) && s.startMonth <= now)
    .reduce((sum, s) => sum + subscriptionMonthlyCost(s, "UAH", state.settings), 0);

  const goals = state.savings.filter((a) => a.goal);
  // How much of its goal an account holds
  const goalShare = (a: (typeof goals)[number]) => (balances.get(a.id) ?? 0) / (a.goal?.target ?? Infinity);
  const largest = Math.max(0, ...classValues.values());
  const classTotal = [...classValues.values()].reduce((s, v) => s + v, 0);

  return {
    transactions: past.length,
    manualTransactions: manual.length,
    manualThisMonth: manual.filter((tx) => monthOf(tx.date) === now).length,
    notedTransactions: past.filter((tx) => tx.note && tx.note.trim().length > 0 && isManual(tx)).length,
    incomeTransactions: past.filter((tx) => tx.type === "income").length,
    subcategoryTransactions: past.filter((tx) => childIds.has(tx.categoryId)).length,
    firstMonth,
    monthsTracked,
    activeDays30,
    weekStreak,
    bestWeekStreak,
    activeWeeks: weeks.size,

    accounts: state.savings.length,
    skinsAccounts: state.savings.filter((a) => a.kind === "skins").length,
    coins: coins.size,
    investments:
      state.investments.length +
      state.savings.filter((a) => a.kind === "crypto" && (a.holdings?.length ?? 0) > 0).length,
    investmentKinds: new Set([
      ...state.investments.map((i) => i.kind),
      ...(cryptoAccountsUAH > 0 || coins.size > 0 ? ["crypto"] : []),
    ]).size,
    inzhurFunds: new Set(state.investments.filter((i) => i.kind === "inzhur" && i.fund).map((i) => i.fund)).size,
    hasBonds: state.investments.some((i) => i.kind === "bonds"),
    hasDeposit: state.investments.some((i) => i.kind === "deposit"),

    budgets: state.budgets.length,
    budgetsTrackedLastMonth: monthly.length,
    budgetsWithinLastMonth: budgetsWithin,
    budgetsKeptLastMonth: monthly.length > 0 && budgetsWithin === monthly.length,
    budgetUsageLastMonth: limitTotal > 0 ? (spentTotal / limitTotal) * 100 : 0,
    budgetStreak,
    budgetKeptMonths,

    goals: goals.length,
    goalsReached: goals.filter((a) => goalShare(a) >= 1).length,
    goalHalfway: goals.some((a) => goalShare(a) >= 0.5),
    customCategories: state.categories.filter((c) => !DEFAULT_CATEGORY_NAMES.has(c.id)).length,
    recurringRules: state.recurring.length,
    subscriptions: state.subscriptions.length,
    stoppedSubscriptions: state.subscriptions.filter((s) => !s.active || (s.endMonth !== undefined && s.endMonth < now))
      .length,
    subscriptionsMonthlyUAH,
    subsShareOfIncome: monthIncomeUAH > 0 ? (subscriptionsMonthlyUAH / monthIncomeUAH) * 100 : 0,

    heldCurrencies: heldCurrencies.size,
    liquidUAH,
    semiLiquidUAH,
    avgExpenseUAH,
    avgIncomeUAH,
    avgIncomeMonths: incomeMonths.length,
    avgExpenseMonths: spendingMonths.length,
    emergencyMonths: avgExpenseUAH > 0 ? (liquidUAH + semiLiquidUAH * 0.5) / avgExpenseUAH : 0,
    netWorthUAH,
    netWorthGrowth6,
    netWorthChange6UAH,
    assetsUAH,
    debtsUAH,
    investedUAH,
    investedShare: assetsUAH > 0 ? (investedUAH / assetsUAH) * 100 : 0,
    assetClasses: classValues.size,
    largestClassShare: classTotal > 0 ? (largest / classTotal) * 100 : 100,
    passiveMonthlyUAH: passiveYearUAH / 12,

    positiveStreak,
    bestStreak,
    positiveMonths: active.filter((m) => m.net > 0).length,
    positiveMonths6: last6.filter((m) => m.net > 0).length,
    completeMonths6: last6.length,
    frugalMonths: active.slice(-12).filter((m) => m.income > 0 && m.expense <= m.income * 0.5).length,
    savingsRate3,
    savingsRatePrev3,
    expenseVolatility,
    topCategoryId: topCategory?.[0] ?? null,
    topCategoryShare: topCategory && expense3 > 0 ? (topCategory[1] / expense3) * 100 : 0,

    taxedIncomes: past.filter((t) => t.type === "income" && t.tax).length,
    debts: state.debts.length,
    debtWithPlan: state.debts.filter((d) => (d.monthlyPayment ?? 0) > 0).length,
    debtPaidHalf: state.debts.some((d) => (d.principal ?? 0) > 0 && d.balance <= (d.principal ?? 0) / 2),
    anyDebtGrowing: state.debts.some((d) => debtPayoff(d, now)?.neverPaysOff === true),
    monthlyDebtPaymentUAH: state.debts.reduce((s, d) => s + toUAH(d.monthlyPayment ?? 0, d.currency), 0),
  };
};

// The achievements whose progress is the account's money, hidden with the amounts
export const MONEY_ACHIEVEMENTS: ReadonlySet<string> = new Set([
  "worth-10k",
  "worth-100k",
  "worth-500k",
  "worth-1m",
  "worth-5m",
  "passive-income",
  "passive-10k",
]);

type Rule = (f: FinanceFacts, health: number) => [current: number, target: number];

// A yes or no as progress towards one
const flag = (v: boolean): [number, number] => [v ? 1 : 0, 1];
// A count rounded to a whole, never below zero
const whole = (v: number) => Math.max(0, Math.round(v));
// A figure cut to a tenth, never below zero
const tenth = (v: number) => Math.max(0, Math.floor(v * 10) / 10);

const RULES: Record<string, Rule> = {
  "first-steps": (f) => [f.transactions, 1],
  "first-income": (f) => [f.incomeTransactions, 1],
  "account-opener": (f) => [f.accounts, 3],
  budgeter: (f) => [f.budgets, 1],
  "goal-setter": (f) => [f.goals, 1],
  categorizer: (f) => [f.customCategories, 1],
  scheduler: (f) => [f.recurringRules, 1],
  subscriber: (f) => [f.subscriptions, 3],
  notetaker: (f) => [f.notedTransactions, 10],
  organizer: (f) => [f.subcategoryTransactions, 10],

  bookkeeper: (f) => [f.manualTransactions, 50],
  "ledger-master": (f) => [f.manualTransactions, 500],
  "ledger-legend": (f) => [f.manualTransactions, 2000],
  "week-streak-4": (f) => [f.bestWeekStreak, 4],
  "week-streak-12": (f) => [f.bestWeekStreak, 12],
  "week-streak-26": (f) => [f.bestWeekStreak, 26],
  "daily-habit": (f) => [f.activeDays30, 15],
  "months-3": (f) => [f.monthsTracked, 3],
  "year-tracker": (f) => [f.monthsTracked, 12],
  "two-years": (f) => [f.monthsTracked, 24],

  "budget-architect": (f) => [f.budgets, 5],
  "budget-keeper": (f) => flag(f.budgetsKeptLastMonth),
  "under-budget": (f) => flag(f.budgets > 0 && f.budgetUsageLastMonth > 0 && f.budgetUsageLastMonth <= 90),
  "budget-streak-3": (f) => [f.budgetStreak, 3],
  "budget-streak-6": (f) => [f.budgetStreak, 6],

  "saver-10": (f) => [whole(f.savingsRate3), 10],
  "saver-20": (f) => [whole(f.savingsRate3), 20],
  "saver-35": (f) => [whole(f.savingsRate3), 35],
  "streak-3": (f) => [f.bestStreak, 3],
  "streak-6": (f) => [f.bestStreak, 6],
  "streak-12": (f) => [f.bestStreak, 12],
  "frugal-month": (f) => [f.frugalMonths, 1],
  "emergency-1": (f) => [tenth(f.emergencyMonths), 1],
  "emergency-3": (f) => [tenth(f.emergencyMonths), 3],
  "emergency-6": (f) => [tenth(f.emergencyMonths), 6],
  "goal-halfway": (f) => flag(f.goalHalfway),
  "goal-crusher": (f) => [f.goalsReached, 1],
  "goal-collector": (f) => [f.goalsReached, 3],

  "worth-10k": (f) => [whole(f.netWorthUAH), 10_000],
  "worth-100k": (f) => [whole(f.netWorthUAH), 100_000],
  "worth-500k": (f) => [whole(f.netWorthUAH), 500_000],
  "worth-1m": (f) => [whole(f.netWorthUAH), 1_000_000],
  "worth-5m": (f) => [whole(f.netWorthUAH), 5_000_000],
  growing: (f) => [whole(f.netWorthGrowth6 ?? 0), 10],
  "multi-currency": (f) => [f.heldCurrencies, 2],
  "all-currencies": (f) => [f.heldCurrencies, 3],
  "debt-planner": (f) => [f.debtWithPlan, 1],
  "debt-crusher": (f) => flag(f.debtPaidHalf),
  "debt-free": (f) => flag(f.debts === 0 && f.monthsTracked >= 3 && f.netWorthUAH > 0),

  investor: (f) => [f.investments, 1],
  depositor: (f) => flag(f.hasDeposit),
  bondholder: (f) => flag(f.hasBonds),
  "inzhur-owner": (f) => [f.inzhurFunds, 1],
  "crypto-holder": (f) => [f.coins, 1],
  gamer: (f) => [f.skinsAccounts, 1],
  "portfolio-5": (f) => [f.investments, 5],
  diversified: (f) => [f.investmentKinds, 3],
  "crypto-basket": (f) => [f.coins, 3],
  "diversified-5": (f) => [f.investmentKinds, 5],
  "inzhur-trio": (f) => [f.inzhurFunds, 3],
  "invested-25": (f) => [whole(f.investedShare), 25],
  "passive-income": (f) => [whole(f.passiveMonthlyUAH), 1_000],
  "passive-10k": (f) => [whole(f.passiveMonthlyUAH), 10_000],

  "tax-aware": (f) => [f.taxedIncomes, 1],
  "tax-pro": (f) => [f.taxedIncomes, 6],
  "subscription-auditor": (f) => [f.stoppedSubscriptions, 1],
  "lean-subs": (f) => flag(f.subscriptions > 0 && f.avgIncomeUAH > 0 && f.subsShareOfIncome <= 5),
  "health-50": (_f, h) => [h, 50],
  "health-70": (_f, h) => [h, 70],
  "health-90": (_f, h) => [h, 90],
};

// Every achievement with how far along it is
export const achievements = (facts: FinanceFacts, healthScore: number): AchievementState[] => {
  return ACHIEVEMENTS.map((def) => {
    const [current, target] = (RULES[def.id] ?? (() => [0, 1]))(facts, healthScore);
    const progress = Math.max(0, Math.min(1, target > 0 ? current / target : 0));
    return Object.assign({}, def, { current, target, progress, unlocked: current >= target });
  });
};

export interface XpBreakdown {
  tracking: number;
  consistency: number;
  results: number;
  achievements: number;
  total: number;
  thisMonth: number;
}

const XP_PER_ENTRY = 2;
const XP_ENTRY_CAP_PER_MONTH = 80;
const XP_PER_ACTIVE_WEEK = 8;
const XP_PER_POSITIVE_MONTH = 40;
const XP_PER_BUDGET_MONTH = 25;
const XP_PER_FRUGAL_MONTH = 20;

// The experience earned by tracking, consistency, results and achievements
export const experience = (state: AppState, facts: FinanceFacts, list: AchievementState[]): XpBreakdown => {
  const today = todayISO();
  const now = currentMonth();
  const perMonth = new Map<string, number>();
  const weeksByMonth = new Map<string, Set<number>>();
  for (const tx of state.transactions) {
    if (tx.date > today || !isManual(tx)) continue;
    const m = monthOf(tx.date);
    perMonth.set(m, (perMonth.get(m) ?? 0) + 1);
    const set = weeksByMonth.get(m) ?? new Set<number>();
    set.add(weekIndex(tx.date));
    weeksByMonth.set(m, set);
  }
  // The tracking experience of a month, capped
  const trackingOf = (m: string) => Math.min(XP_ENTRY_CAP_PER_MONTH, (perMonth.get(m) ?? 0) * XP_PER_ENTRY);
  const tracking = [...perMonth.keys()].reduce((s, m) => s + trackingOf(m), 0);
  const consistency = facts.activeWeeks * XP_PER_ACTIVE_WEEK;
  const results =
    facts.positiveMonths * XP_PER_POSITIVE_MONTH +
    facts.budgetKeptMonths * XP_PER_BUDGET_MONTH +
    facts.frugalMonths * XP_PER_FRUGAL_MONTH;
  const achievementsXp = list.filter((a) => a.unlocked).reduce((s, a) => s + a.xp, 0);
  const thisWeeks = weeksByMonth.get(now)?.size ?? 0;
  return {
    tracking,
    consistency,
    results,
    achievements: achievementsXp,
    total: tracking + consistency + results + achievementsXp,
    thisMonth: trackingOf(now) + thisWeeks * XP_PER_ACTIVE_WEEK,
  };
};

export interface LevelInfo {
  xp: number;
  level: number;
  floor: number;
  next: number;
  progress: number;
  rank: number;
  nextRankLevel: number | null;
}

const RANK_FLOORS = [1, 3, 5, 8, 11, 15, 20, 25, 32, 40];

// The experience a level starts at
export const levelThreshold = (level: number): number => {
  const n = level - 1;
  return 100 * n + 25 * n * Math.max(0, n - 1);
};

// The rank a level carries
export const rankOf = (level: number): number => {
  let rank = 1;
  RANK_FLOORS.forEach((floor, i) => {
    if (level >= floor) rank = i + 1;
  });
  return rank;
};

// The level of some experience and the way to the next
export const levelOf = (xp: number): LevelInfo => {
  let level = 1;
  while (levelThreshold(level + 1) <= xp) level++;
  const floor = levelThreshold(level);
  const next = levelThreshold(level + 1);
  const rank = rankOf(level);
  return {
    xp,
    level,
    floor,
    next,
    progress: next > floor ? (xp - floor) / (next - floor) : 1,
    rank,
    nextRankLevel: RANK_FLOORS[rank] ?? null,
  };
};

export type HealthGrade = "excellent" | "good" | "fair" | "weak";

export type HealthPartId = "savings" | "cushion" | "debt" | "budgets" | "stability" | "diversity" | "investing";

export interface HealthPart {
  id: HealthPartId;
  score: number;
  max: number;
  value: number;
}

export interface HealthReport {
  score: number;
  grade: HealthGrade;
  parts: HealthPart[];
  tips: HealthPartId[];
  enoughData: boolean;
  hasData: boolean;
}

// A value kept between zero and one
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// The health score out of a hundred, its parts and what to work on
export const financialHealth = (facts: FinanceFacts): HealthReport => {
  const savings = 20 * clamp01(facts.savingsRate3 / 20);

  const cushion =
    facts.avgExpenseUAH > 0 ? 20 * Math.pow(clamp01(facts.emergencyMonths / 6), 0.8) : facts.liquidUAH > 0 ? 10 : 0;

  const debtRatio = facts.assetsUAH > 0 ? facts.debtsUAH / facts.assetsUAH : facts.debtsUAH > 0 ? 1 : 0;
  const dti = facts.avgIncomeUAH > 0 ? facts.monthlyDebtPaymentUAH / facts.avgIncomeUAH : facts.debts > 0 ? 1 : 0;
  const debt =
    facts.debts === 0
      ? 15
      : Math.max(
          0,
          15 * (0.5 * clamp01(1 - debtRatio / 0.6) + 0.5 * clamp01(1 - dti / 0.4)) - (facts.anyDebtGrowing ? 4 : 0),
        );

  const budgets =
    facts.budgetsTrackedLastMonth > 0
      ? 10 *
        (0.7 * (facts.budgetsWithinLastMonth / facts.budgetsTrackedLastMonth) +
          0.3 * (facts.budgetUsageLastMonth <= 100 ? 1 : clamp01(1 - (facts.budgetUsageLastMonth - 100) / 50)))
      : 3;

  const stability =
    facts.completeMonths6 >= 2
      ? 6 * (facts.positiveMonths6 / facts.completeMonths6) + 4 * (1 - clamp01(facts.expenseVolatility / 0.5))
      : 5;

  const spread = facts.assetClasses + Math.max(0, facts.heldCurrencies - 1);
  const diversity =
    7 * clamp01(spread / 5) + 3 * (facts.largestClassShare <= 60 ? 1 : clamp01((90 - facts.largestClassShare) / 30));

  const passiveTarget = facts.avgExpenseUAH * 0.1;
  const investing =
    10 * clamp01(facts.investedShare / 30) +
    5 * (passiveTarget > 0 ? clamp01(facts.passiveMonthlyUAH / passiveTarget) : facts.passiveMonthlyUAH > 0 ? 1 : 0);

  const parts: HealthPart[] = [
    { id: "savings", score: savings, max: 20, value: facts.savingsRate3 },
    { id: "cushion", score: cushion, max: 20, value: facts.emergencyMonths },
    { id: "debt", score: debt, max: 15, value: debtRatio * 100 },
    { id: "budgets", score: budgets, max: 10, value: facts.budgetUsageLastMonth },
    { id: "stability", score: stability, max: 10, value: facts.positiveMonths6 },
    { id: "diversity", score: diversity, max: 10, value: spread },
    { id: "investing", score: investing, max: 15, value: facts.investedShare },
  ];
  const score = Math.round(parts.reduce((s, p) => s + p.score, 0));
  const grade: HealthGrade = score >= 85 ? "excellent" : score >= 70 ? "good" : score >= 50 ? "fair" : "weak";
  const tips = parts
    .filter((p) => p.score / p.max < 0.7)
    .toSorted((a, b) => a.score / a.max - b.score / b.max)
    .slice(0, 3)
    .map((p) => p.id);
  // Without a single entry there is nothing to score yet
  const hasData = facts.monthsTracked > 0;
  return {
    score: hasData ? score : 0,
    grade,
    parts,
    tips: hasData ? tips : [],
    enoughData: facts.monthsTracked >= 3,
    hasData,
  };
};

// The facts, health, achievements, experience and level of the data
export const gamification = (state: AppState) => {
  const facts = financeFacts(state);
  const health = financialHealth(facts);
  const list = achievements(facts, health.score);
  const xp = experience(state, facts, list);
  return {
    facts,
    health,
    achievements: list,
    xp,
    level: levelOf(xp.total),
  };
};
