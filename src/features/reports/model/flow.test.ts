import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";

import { FLOW_KEPT, FLOW_OTHER, FLOW_SAVINGS, moneyFlow } from "./flow";
import { report } from "./report";

// An entry in hryvnias in October
const entry = (id: string, type: Transaction["type"], categoryId: string, amount: number): Transaction => ({
  id,
  type,
  amount,
  currency: "UAH",
  categoryId,
  date: "2026-10-05",
});

const state: AppState = {
  ...DEFAULT_STATE,
  transactions: [
    entry("pay", "income", "cat-salary", 3000),
    entry("gig", "income", "cat-freelance", 1000),
    entry("rent", "expense", "cat-rent", 2000),
    entry("milk", "expense", "cat-groceries", 500),
    entry("taxi", "expense", "cat-taxi", 300),
  ],
};

describe("moneyFlow", () => {
  it("sends the sources into the categories and what was kept, the rest gathered", () => {
    const flow = moneyFlow(report(state, "month", "2026-10"), 4, 2);
    expect(flow).toEqual({
      sources: [
        { id: "cat-salary", value: 3000 },
        { id: "cat-freelance", value: 1000 },
      ],
      uses: [
        { id: "cat-housing", value: 2000 },
        { id: "cat-food", value: 500 },
        { id: FLOW_OTHER, value: 300 },
        { id: FLOW_KEPT, value: 1200 },
      ],
      total: 4000,
    });
  });

  it("draws on savings when more went out than came in, and needs both sides", () => {
    const short = { ...state, transactions: [...state.transactions, entry("tv", "expense", "cat-taxi", 2000)] };
    const flow = moneyFlow(report(short, "month", "2026-10"));
    expect(flow?.sources.at(-1)).toEqual({ id: FLOW_SAVINGS, value: 800 });
    expect(flow?.total).toBe(4800);
    expect(moneyFlow(report(state, "month", "2026-08"))).toBeNull();
  });
});
