import { describe, expect, it } from "vitest";

import { categoryName } from "@/features/data/model/categoryName";
import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";
import { budgetCrossings, operationMessage } from "@/features/notifications/model/alerts";
import { en } from "@/shared/i18n/messages/en";
import { makeI18n } from "@/shared/i18n/translate";

const EN = makeI18n("en", en);

// An expense with any fields changed
const tx = (over: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36).slice(2),
  type: "expense",
  amount: 100,
  currency: "UAH",
  categoryId: "cat-food",
  date: "2026-09-10",
  ...over,
});

const base: AppState = {
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_STATE.settings, baseCurrency: "UAH" },
  savings: [{ id: "black", name: "Mono Black", icon: "💳", kind: "card", currency: "UAH", openingBalance: 0 }],
  budgets: [{ categoryId: "cat-food", limit: 1000, currency: "UAH" }],
};

describe("operationMessage", () => {
  it("leads with the signed amount and the merchant, and opens the entry", () => {
    const entry = tx({ id: "t1", amount: 420, note: "SILPO", accountId: "black" });
    const message = operationMessage(base, entry, EN);
    expect(message.title).toMatch(/^−420\u00A0₴ · SILPO$/u);
    expect(message.body.split("\n")[0]).toBe(
      `${categoryName(
        EN,
        base.categories.find((c) => c.id === "cat-food"),
      )} · Mono Black`,
    );
    expect(message.url).toBe("/transactions?tx=t1");
  });
});

// The state with an expense of an amount this month and any more entries
const withSpent = (amount: number, extra: Transaction[] = []) => ({
  ...base,
  transactions: [tx({ amount }), ...extra],
});

describe("budgetCrossings", () => {
  it("speaks up when an operation takes a budget past 80% or past 100%", () => {
    const entry = tx({ amount: 150 });
    const near = budgetCrossings(withSpent(700), withSpent(700, [entry]), entry, EN);
    expect(near.map((m) => m.body)).toEqual(["85% used: 850\u00A0₴ of 1,000\u00A0₴"]);
    const over = budgetCrossings(withSpent(900), withSpent(900, [entry]), entry, EN);
    expect(over.map((m) => m.body)).toEqual(["Over the limit: 1,050\u00A0₴ of 1,000\u00A0₴"]);
  });

  it("stays quiet below the mark, once past it, and for income", () => {
    const entry = tx({ amount: 50 });
    expect(budgetCrossings(withSpent(100), withSpent(100, [entry]), entry, EN)).toEqual([]);
    expect(budgetCrossings(withSpent(850), withSpent(850, [entry]), entry, EN)).toEqual([]);
    const income = tx({ type: "income", amount: 5000 });
    expect(budgetCrossings(withSpent(700), withSpent(700, [income]), income, EN)).toEqual([]);
  });

  it("counts a subcategory towards its parent's budget", () => {
    const parent = base.categories.find((c) => c.id === "cat-food")!;
    const child = { ...parent, id: "cat-food-cafe", name: "Cafés", parentId: "cat-food" };
    const s = { ...base, categories: [...base.categories, child] };
    const entry = tx({ amount: 900, categoryId: "cat-food-cafe" });
    const crossed = budgetCrossings(s, { ...s, transactions: [entry] }, entry, EN);
    expect(crossed).toHaveLength(1);
    expect(crossed[0]?.tag).toBe("budget-cat-food-2026-09");
  });
});
