import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Category, RecurringRule } from "@/features/data/model/types";

import { looksLikeFixedPayment, plansBookedAsSpending } from "./categories";
import { materializeRecurring, stopSchedules } from "./schedules";

// A monthly food plan with the given fields
const rule = (over: Partial<RecurringRule>): RecurringRule => ({
  id: "food",
  type: "expense",
  amount: 7000,
  currency: "UAH",
  categoryId: "cat-food",
  dayOfMonth: 1,
  startMonth: "2026-06",
  ...over,
});

const base: AppState = {
  ...DEFAULT_STATE,
  budgets: [
    { categoryId: "cat-food", limit: 7000, currency: "UAH" },
    { categoryId: "cat-rent", limit: 20_000, currency: "UAH" },
  ],
};

describe("plansBookedAsSpending", () => {
  it("finds rules that post exactly their category's budget", () => {
    const s = { ...base, recurring: [rule({}), rule({ id: "rent", categoryId: "cat-rent", amount: 14_000 })] };
    expect(plansBookedAsSpending(s, "2026-09").map((r) => r.id)).toEqual(["food"]);
  });

  it("ignores income, other currencies and rules outside the month", () => {
    const s = {
      ...base,
      recurring: [
        rule({ id: "in", type: "income" }),
        rule({ id: "usd", currency: "USD" }),
        rule({ id: "ended", endMonth: "2026-08" }),
        rule({ id: "later", startMonth: "2026-10" }),
      ],
    };
    expect(plansBookedAsSpending(s, "2026-09")).toEqual([]);
  });
});

// An expense category with a name
const cat = (id: string, name: string): Category => ({ id, name, icon: "", colorSlot: 1, kind: "expense" });

describe("looksLikeFixedPayment", () => {
  it("recognises bills by default id or by name, in either language", () => {
    expect(looksLikeFixedPayment(cat("cat-rent", "Rent"))).toBe(true);
    expect(looksLikeFixedPayment(cat("custom-1", "Оренда квартири"))).toBe(true);
    expect(looksLikeFixedPayment(cat("custom-2", "Комуналка"))).toBe(true);
    expect(looksLikeFixedPayment(cat("custom-3", "Car loan"))).toBe(true);
  });

  it("leaves everyday spending alone", () => {
    expect(looksLikeFixedPayment(cat("cat-food", "Food"))).toBe(false);
    expect(looksLikeFixedPayment(cat("cat-wants", "Fun & Wants"))).toBe(false);
    expect(looksLikeFixedPayment()).toBe(false);
  });
});

describe("stopSchedules", () => {
  it("ends the rule last month: this month's and later entries go, earlier ones stay", () => {
    const s = materializeRecurring({ ...base, recurring: [rule({})] });
    const stopped = stopSchedules(s, ["food"], "2026-09");
    expect(stopped.recurring[0]?.endMonth).toBe("2026-08");
    const months = stopped.transactions.filter((t) => t.recurringId === "food").map((t) => t.date.slice(0, 7));
    expect(months).toEqual(["2026-06", "2026-07", "2026-08"]);
  });

  it("removes a rule that only began this month", () => {
    const s = materializeRecurring({ ...base, recurring: [rule({ startMonth: "2026-09" })] });
    const stopped = stopSchedules(s, ["food"], "2026-09");
    expect(stopped.recurring).toEqual([]);
    expect(stopped.transactions).toEqual([]);
  });
});
