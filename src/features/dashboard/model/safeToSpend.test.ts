import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";

import { safeToSpend } from "./safeToSpend";

describe("safeToSpend", () => {
  it("adds this month's share of a yearly budget to what the budgets leave", () => {
    const state: AppState = {
      ...DEFAULT_STATE,
      budgets: [{ categoryId: "cat-travel", limit: 12000, currency: "UAH", period: "yearly" }],
      transactions: [
        { id: "trip", type: "expense", amount: 3000, currency: "UAH", categoryId: "cat-travel", date: "2026-03-10" },
        { id: "bus", type: "expense", amount: 500, currency: "UAH", categoryId: "cat-travel", date: "2026-10-02" },
      ],
    };
    expect(safeToSpend(state, "2026-10-10")).toMatchObject({ source: "budgets", limit: 3000, left: 2500 });
  });
});
