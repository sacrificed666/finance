import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";

import { accountsSummary, balancesByCurrency } from "./summary";

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [
    { id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 3000 },
    { id: "cash", name: "Cash", icon: "💵", kind: "cash", currency: "UAH", openingBalance: 1000 },
    { id: "usd", name: "Dollars", icon: "💵", kind: "cash", currency: "USD", openingBalance: 100 },
    { id: "empty", name: "Empty", icon: "💳", kind: "card", currency: "EUR", openingBalance: 0 },
  ],
};

describe("accountsSummary", () => {
  it("adds up the money of each kind, the largest first", () => {
    const summary = accountsSummary(state, "2026-10-10");
    expect(summary.byKind.map(([kind]) => kind)).toEqual(["cash", "card"]);
    expect(summary.delta).toBe(0);
  });
});

describe("balancesByCurrency", () => {
  it("skips empty currencies and sorts by value", () => {
    const rows = balancesByCurrency(state, "2026-10-10");
    expect(rows.map((row) => row.currency)).toEqual(["USD", "UAH"]);
    expect(rows[1]).toMatchObject({ native: 4000, base: 4000 });
  });
});
