import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, SavingsAccount, Transaction } from "@/features/data/model/types";

import { graceDue, gracesDue } from "./grace";

const card: SavingsAccount = {
  id: "mono",
  name: "Mono",
  icon: "💳",
  kind: "card",
  currency: "UAH",
  openingBalance: 0,
  credit: { limit: 50000 },
};

// An entry on the card
const entry = (over: Partial<Transaction> & Pick<Transaction, "id" | "date" | "amount">): Transaction => ({
  type: "expense",
  currency: "UAH",
  categoryId: "cat-groceries",
  accountId: "mono",
  ...over,
});

describe("the grace period of a credit card", () => {
  const state: AppState = {
    ...DEFAULT_STATE,
    savings: [card, { ...card, id: "debit", name: "Debit", credit: undefined }],
    transactions: [
      entry({ id: "shop", date: "2026-09-20", amount: 8000 }),
      entry({ id: "pay", date: "2026-10-05", amount: 3000, type: "income", categoryId: "cat-salary" }),
      entry({ id: "later", date: "2026-10-12", amount: 900 }),
    ],
  };

  it("asks for last month's debt less what came in, by this month's end", () => {
    expect(graceDue(state, card, "2026-10-15")).toMatchObject({ amount: 5000, due: "2026-10-31" });
    expect(gracesDue(state, "2026-10-15").map((due) => due.account.id)).toEqual(["mono"]);
  });

  it("asks nothing of a card without credit, one paid back or one in the plus", () => {
    expect(graceDue(state, { ...card, credit: undefined }, "2026-10-15")).toBeNull();
    const paid = {
      ...state,
      transactions: [
        ...state.transactions,
        entry({ id: "back", date: "2026-10-14", amount: 5000, type: "income", categoryId: "cat-salary" }),
      ],
    };
    expect(graceDue(paid, card, "2026-10-15")).toBeNull();
    expect(graceDue(state, card, "2026-09-25")).toBeNull();
  });
});
