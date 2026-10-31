import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import {
  accountBalance,
  accountBalances,
  buildProjection,
  expensesByCategory,
  historyMonths,
  monthlySeries,
  monthTotals,
  netWorth,
  spentInCategory,
} from "@/features/data/model/finmath";
import type { Transaction } from "@/features/data/model/types";

// An entry of a type on a date
const entry = (type: Transaction["type"], date: string): Transaction => ({
  id: date + type,
  type,
  amount: 1,
  currency: "UAH",
  categoryId: "c",
  date,
});

describe("historyMonths", () => {
  it("counts the months from the first income or expense, transfers aside", () => {
    const txs = [entry("transfer", "2025-01-02"), entry("expense", "2026-04-30"), entry("income", "2026-06-01")];
    expect(historyMonths(txs, "2026-10")).toBe(7);
    expect(historyMonths(txs, "2026-10", "income")).toBe(5);
    expect(historyMonths([], "2026-10")).toBe(0);
  });
});

describe("entries left out", () => {
  const txs: Transaction[] = [
    { ...entry("expense", "2026-10-02"), id: "lunch", amount: 300, accountId: "card" },
    { ...entry("expense", "2026-10-03"), id: "trip", amount: 5000, accountId: "card", excluded: true },
    { ...entry("income", "2026-10-04"), id: "back", amount: 5000, accountId: "card", excluded: true },
  ];

  it("count towards no income, spending or category, but still move the balance", () => {
    const { settings } = DEFAULT_STATE;
    expect(monthTotals(txs, "2026-10", settings)).toEqual({ income: 0, expense: 300, net: -300 });
    expect(monthlySeries(txs, "2026-10", 1, settings)[0]).toMatchObject({ income: 0, expense: 300 });
    expect(expensesByCategory(txs, "2026-10", settings).get("c")).toBe(300);
    expect(spentInCategory(txs, "c", "2026-10", "UAH", settings)).toBe(300);
    const state = {
      ...DEFAULT_STATE,
      savings: [
        { id: "card", name: "Card", icon: "💳", kind: "card" as const, currency: "UAH" as const, openingBalance: 0 },
      ],
      transactions: txs,
    };
    expect(accountBalances(state, "2026-10-31").get("card")).toBe(-300);
  });
});

describe("account balances in their own currency", () => {
  const card = {
    id: "card",
    name: "Card",
    icon: "💳",
    kind: "card" as const,
    currency: "UAH" as const,
    openingBalance: 0,
  };
  const usd = { ...card, id: "usd", currency: "USD" as const, openingBalance: 100 };
  const settings = {
    ...DEFAULT_STATE.settings,
    rates: { USD: 42, EUR: 48 },
    monthRates: { "2026-09": { USD: 41, EUR: 47 } },
  };

  it("converts an entry in another currency at the rates of its month", () => {
    const dollars: Transaction = { ...entry("expense", "2026-09-10"), amount: 20, currency: "USD", accountId: "card" };
    const now: Transaction = { ...entry("expense", "2026-10-10"), amount: 10, currency: "USD", accountId: "card" };
    const state = { ...DEFAULT_STATE, settings, savings: [card], transactions: [dollars, now] };
    expect(accountBalances(state).get("card")).toBe(-1240);
    expect(accountBalance(card, state.transactions, settings, "2026-09-30")).toBe(-820);
  });

  it("moves a transfer out in the sender's currency and in by the amount received", () => {
    const transfer: Transaction = {
      ...entry("transfer", "2026-10-05"),
      categoryId: "",
      amount: 50,
      currency: "USD",
      accountId: "usd",
      toAccountId: "card",
      toAmount: 2080,
    };
    const state = { ...DEFAULT_STATE, settings, savings: [card, usd], transactions: [transfer] };
    expect(Object.fromEntries(accountBalances(state))).toEqual({ card: 2080, usd: 50 });
    expect(accountBalance(usd, [transfer], settings)).toBe(50);
    const bare = { ...transfer, toAmount: undefined };
    expect(accountBalance(card, [bare], settings)).toBe(2100);
  });
});

describe("buildProjection", () => {
  it("starts from the money in accounts and the money owed back, like net worth", () => {
    const card = {
      id: "card",
      name: "Card",
      icon: "💳",
      kind: "card" as const,
      currency: "UAH" as const,
      openingBalance: 1000,
    };
    const lent = {
      id: "l",
      name: "Oleh",
      icon: "🤝",
      amount: 400,
      currency: "UAH" as const,
      date: "2026-09-01",
      repaid: 100,
    };
    const state = { ...DEFAULT_STATE, savings: [card], receivables: [lent] };
    const [first] = buildProjection(state, "2026-10-10", 1, {});
    expect(first?.savings).toBe(1300);
    expect(first?.net).toBe(netWorth(state, "2026-10-10").total);
  });
});
