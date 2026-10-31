import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { SavingsAccount, Transaction } from "@/features/data/model/types";

import { balanceTrail, savingsTrail } from "./balanceTrail";

const card: SavingsAccount = {
  id: "card",
  name: "Card",
  icon: "💳",
  kind: "card",
  currency: "UAH",
  openingBalance: 100,
};

// An income or expense on the card
const move = (id: string, date: string, amount: number, type: "income" | "expense"): Transaction => ({
  id,
  type,
  amount,
  currency: "UAH",
  categoryId: "",
  date,
  accountId: "card",
});

describe("balanceTrail", () => {
  it("reads the balance at each month's end and today", () => {
    const moves = [move("a", "2026-08-10", 50, "income"), move("b", "2026-10-02", 30, "expense")];
    const state = { ...DEFAULT_STATE, savings: [card], transactions: moves };
    expect(balanceTrail(card, state, "2026-10-28", 3)).toEqual([100, 150, 150, 120]);
  });
});

describe("savingsTrail", () => {
  it("adds every account up in the base currency at the same points", () => {
    const dollars: SavingsAccount = { ...card, id: "usd", currency: "USD", openingBalance: 10 };
    const state = {
      ...DEFAULT_STATE,
      settings: { ...DEFAULT_STATE.settings, rates: { USD: 40, EUR: 45 } },
      savings: [card, dollars],
      transactions: [move("a", "2026-09-10", 50, "income")],
    };
    expect(savingsTrail(state, "2026-10-28", 2)).toEqual([500, 550, 550]);
  });
});
