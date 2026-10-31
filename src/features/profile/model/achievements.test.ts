import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Investment, Transaction } from "@/features/data/model/types";
import { addDays, addMonths } from "@/shared/lib/date";

import { financeFacts, financialHealth, gamification, levelOf, levelThreshold, rankOf } from "./achievements";

// An investment of a kind with plain terms
const investment = (id: string, kind: Investment["kind"], extra: Partial<Investment> = {}): Investment => ({
  id,
  name: id,
  kind,
  currency: "UAH",
  principal: 100_000,
  annualRatePct: 15,
  startDate: "2025-06-01",
  endDate: "2027-06-01",
  compounding: "payout",
  compoundingFreq: "monthly",
  ...extra,
});

// Fourteen months of salary and rent, and a shop every week
const history = (): Transaction[] => {
  const salaries = Array.from({ length: 14 }, (_, i): Transaction => {
    const month = addMonths("2025-08", i);
    return {
      id: `pay-${month}`,
      type: "income",
      amount: 50_000,
      currency: "UAH",
      categoryId: "cat-salary",
      date: `${month}-01`,
      ...(i < 6 ? { tax: { ratePct: 5, fixedUAH: 0, gross: 52_000 } } : {}),
    };
  });
  const rent = salaries.map((pay, i): Transaction => ({
    id: `rent-${String(i)}`,
    type: "expense",
    amount: 10_000 + (i % 3) * 1000,
    currency: "UAH",
    categoryId: "cat-rent",
    date: pay.date.replace(/-01$/u, "-05"),
  }));
  const shops = Array.from({ length: 62 }, (_, i): Transaction => ({
    id: `shop-${String(i)}`,
    type: "expense",
    amount: 500,
    currency: "UAH",
    categoryId: "cat-groceries",
    date: addDays("2025-08-04", i * 7),
    note: "Weekly shop",
  }));
  return [...salaries, ...rent, ...shops];
};

// An account with goals, currencies, investments, a debt and budgets
const RICH: AppState = {
  ...DEFAULT_STATE,
  categories: [...DEFAULT_STATE.categories, { id: "mine", name: "Mine", icon: "⭐", colorSlot: 5, kind: "expense" }],
  transactions: history(),
  savings: [
    {
      id: "card",
      name: "Card",
      icon: "💳",
      kind: "card",
      currency: "UAH",
      openingBalance: 200_000,
      goal: { target: 100_000 },
    },
    {
      id: "usd",
      name: "Dollars",
      icon: "💵",
      kind: "savings",
      currency: "USD",
      openingBalance: 5000,
      goal: { target: 8000 },
    },
    { id: "eur", name: "Euro", icon: "💶", kind: "cash", currency: "EUR", openingBalance: 1000 },
    { id: "skins", name: "Skins", icon: "🎮", kind: "skins", currency: "USD", openingBalance: 300, game: "cs2" },
    {
      id: "wallet",
      name: "Wallet",
      icon: "🔗",
      kind: "crypto",
      currency: "USD",
      openingBalance: 0,
      holdings: [
        { coin: "bitcoin", quantity: 0.1, price: 60_000 },
        { coin: "ethereum", quantity: 1, price: 3000 },
        { coin: "solana", quantity: 10, price: 150 },
      ],
    },
  ],
  investments: [
    investment("deposit", "deposit"),
    investment("bonds", "bonds", { compounding: "reinvest" }),
    investment("reit", "inzhur", { fund: "inzhur-reit", marketValue: 110_000 }),
    investment("energy", "inzhur", { fund: "inzhur-energy", marketValue: 100_000 }),
    investment("stocks", "stocks", {
      marketValue: 120_000,
      currency: "USD",
      principal: 2000,
      monthlyContribution: 100,
    }),
  ],
  budgets: [{ categoryId: "cat-food", limit: 50_000, currency: "UAH" }],
  debts: [
    {
      id: "loan",
      name: "Loan",
      icon: "🏦",
      kind: "loan",
      currency: "UAH",
      balance: 4000,
      principal: 10_000,
      annualRatePct: 10,
      monthlyPayment: 1000,
    },
  ],
  recurring: [
    {
      id: "r1",
      type: "expense",
      amount: 100,
      currency: "UAH",
      categoryId: "cat-rent",
      dayOfMonth: 5,
      startMonth: "2026-01",
    },
  ],
  subscriptions: [
    {
      id: "music",
      name: "Music",
      icon: "🎵",
      price: 200,
      currency: "UAH",
      period: "monthly",
      dayOfMonth: 3,
      startMonth: "2025-01",
      active: true,
    },
    {
      id: "old",
      name: "Old",
      icon: "📺",
      price: 300,
      currency: "UAH",
      period: "monthly",
      dayOfMonth: 3,
      startMonth: "2025-01",
      active: false,
    },
  ],
};

describe("levels", () => {
  it("grows the experience each level needs and names ranks by level", () => {
    expect(levelThreshold(1)).toBe(0);
    expect(levelThreshold(2)).toBe(100);
    expect(levelThreshold(3)).toBe(250);
    expect(levelOf(120)).toMatchObject({ level: 2, floor: 100, next: 250, rank: 1, nextRankLevel: 3 });
    expect(rankOf(40)).toBe(10);
  });
});

describe("gamification", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts an empty account at level one with nothing unlocked", () => {
    const g = gamification(DEFAULT_STATE);
    expect(g.level.level).toBe(1);
    expect(g.achievements.some((achievement) => achievement.unlocked)).toBe(false);
    expect(g.health.enoughData).toBe(false);
  });

  it("judges a well kept year of finances", () => {
    const g = gamification(RICH);
    expect(g.facts).toMatchObject({
      monthsTracked: 15,
      accounts: 5,
      skinsAccounts: 1,
      coins: 3,
      inzhurFunds: 2,
      hasBonds: true,
      hasDeposit: true,
      goals: 2,
      goalsReached: 1,
      customCategories: 1,
      stoppedSubscriptions: 1,
      heldCurrencies: 3,
      taxedIncomes: 6,
      debtWithPlan: 1,
      debtPaidHalf: true,
      budgetsKeptLastMonth: true,
    });
    expect(g.facts.bestWeekStreak).toBeGreaterThanOrEqual(26);
    expect(g.facts.netWorthGrowth6).not.toBeNull();
    expect(g.facts.topCategoryId).toBe("cat-housing");
    const unlocked = g.achievements.filter((a) => a.unlocked).map((a) => a.id);
    expect(unlocked).toEqual(
      expect.arrayContaining([
        "first-steps",
        "bookkeeper",
        "week-streak-26",
        "year-tracker",
        "budget-keeper",
        "goal-crusher",
        "all-currencies",
        "depositor",
        "bondholder",
        "crypto-basket",
        "gamer",
        "portfolio-5",
        "tax-pro",
        "subscription-auditor",
        "debt-crusher",
        "categorizer",
        "notetaker",
        "organizer",
      ]),
    );
    expect(g.health.enoughData).toBe(true);
    expect(g.health.score).toBeGreaterThan(50);
    expect(g.level.level).toBeGreaterThan(5);
    expect(g.xp.total).toBe(g.xp.tracking + g.xp.consistency + g.xp.results + g.xp.achievements);
  });

  it("scores nothing until there is an entry", () => {
    const empty = financialHealth(financeFacts(DEFAULT_STATE));
    expect(empty).toMatchObject({ hasData: false, score: 0, tips: [] });
  });

  it("weighs debts, budgets and a thin cushion in the health score", () => {
    const base = { ...financeFacts(DEFAULT_STATE), monthsTracked: 6 };
    const strained = financialHealth({
      ...base,
      debts: 1,
      debtsUAH: 1000,
      assetsUAH: 0,
      anyDebtGrowing: true,
      budgetsTrackedLastMonth: 2,
      budgetsWithinLastMonth: 1,
      budgetUsageLastMonth: 130,
      completeMonths6: 6,
      positiveMonths6: 3,
      expenseVolatility: 0.25,
      liquidUAH: 100,
      largestClassShare: 75,
      passiveMonthlyUAH: 10,
    });
    expect(strained.grade).toBe("weak");
    expect(strained.parts.find((part) => part.id === "cushion")?.score).toBe(10);
    expect(strained.parts.find((part) => part.id === "debt")?.score).toBe(0);
    expect(strained.parts.find((part) => part.id === "investing")?.score).toBe(5);
    expect(strained.tips).toHaveLength(3);
    const fine = financialHealth({
      ...base,
      debts: 1,
      debtsUAH: 100,
      assetsUAH: 10_000,
      avgIncomeUAH: 10_000,
      monthlyDebtPaymentUAH: 100,
    });
    expect(fine.parts.find((part) => part.id === "debt")?.score).toBeGreaterThan(13);
    expect(
      financialHealth({ ...base, debts: 1, avgIncomeUAH: 0 }).parts.find((part) => part.id === "debt")?.score,
    ).toBeLessThan(8);
  });

  it("grades the score in four steps", () => {
    const base = financeFacts(DEFAULT_STATE);
    const top = {
      ...base,
      savingsRate3: 30,
      avgExpenseUAH: 1000,
      emergencyMonths: 12,
      investedShare: 40,
      passiveMonthlyUAH: 500,
      assetClasses: 5,
      largestClassShare: 30,
    };
    expect(financialHealth(top).grade).toBe("excellent");
    expect(financialHealth({ ...top, investedShare: 0, passiveMonthlyUAH: 0 }).grade).toBe("good");
    expect(
      financialHealth({ ...top, investedShare: 0, passiveMonthlyUAH: 0, assetClasses: 0, savingsRate3: 5 }).grade,
    ).toBe("fair");
  });

  it("rewards logged entries with experience", () => {
    const state: AppState = {
      ...DEFAULT_STATE,
      transactions: [
        { id: "a", type: "expense", amount: 100, currency: "UAH", categoryId: "cat-groceries", date: "2026-10-01" },
        { id: "b", type: "income", amount: 1000, currency: "UAH", categoryId: "cat-salary", date: "2026-10-02" },
      ],
    };
    const g = gamification(state);
    expect(g.xp.tracking).toBe(4);
    expect(g.facts.manualTransactions).toBe(2);
  });
});
