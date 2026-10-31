import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";

import { cashAhead } from "./cashAhead";

// A planned entry in hryvnias
const planned = (id: string, type: Transaction["type"], amount: number, date: string): Transaction => ({
  id,
  type,
  amount,
  currency: "UAH",
  categoryId: "cat-groceries",
  date,
});

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [
    { id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 1000 },
    { id: "coins", name: "Coins", icon: "🪙", kind: "crypto", currency: "UAH", openingBalance: 5000 },
  ],
  transactions: [
    planned("rent", "expense", 1500, "2026-10-12"),
    planned("pay", "income", 2000, "2026-10-14"),
    planned("move", "transfer", 100, "2026-10-13"),
    planned("far", "expense", 10, "2026-12-01"),
  ],
};

describe("cashAhead", () => {
  it("follows the spendable money day by day with the planned entries", () => {
    const ahead = cashAhead(state, "2026-10-10", 30);
    expect(ahead.start).toBe(1000);
    expect(ahead.points).toHaveLength(31);
    expect(ahead.upcoming.map((tx) => tx.id)).toEqual(["rent", "pay"]);
    expect(ahead.lowest).toEqual({ date: "2026-10-12", value: -500, change: -1500 });
    expect(ahead.firstBelowZero?.date).toBe("2026-10-12");
    expect(ahead.end).toMatchObject({ date: "2026-11-09", value: 1500 });
  });

  it("starts the line at today's money when nothing is planned", () => {
    const ahead = cashAhead({ ...state, transactions: [] }, "2026-10-10", 60);
    expect(ahead.lowest).toEqual({ date: "2026-10-10", value: 1000, change: 0 });
    expect(ahead.firstBelowZero).toBeUndefined();
  });
});
