import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { SavingsAccount } from "@/features/data/model/types";

import { adjustmentEntry, reconcileProblem } from "./reconcile";

const card: SavingsAccount = { id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 0 };

describe("reconcileProblem", () => {
  it("needs a number that differs from the balance", () => {
    expect(reconcileProblem(DEFAULT_STATE, "", 100)).toBe("balance.move.problem.enter");
    expect(reconcileProblem(DEFAULT_STATE, "100", 100)).toBe("balance.move.problem.matches");
    expect(reconcileProblem(DEFAULT_STATE, "120", 100)).toBeNull();
    expect(reconcileProblem({ ...DEFAULT_STATE, categories: [] }, "120", 100)).toBe("balance.move.problem.categories");
  });
});

describe("adjustmentEntry", () => {
  it("books the difference as other income or other spending", () => {
    expect(adjustmentEntry(DEFAULT_STATE, card, 20, "2026-10-10", "Matched", "a1")).toMatchObject({
      type: "income",
      amount: 20,
      categoryId: "cat-other-inc",
      accountId: "card",
    });
    expect(adjustmentEntry(DEFAULT_STATE, card, -5, "2026-10-10", "Matched", "a2")).toMatchObject({
      type: "expense",
      amount: 5,
      categoryId: "cat-other-exp",
    });
  });
});
