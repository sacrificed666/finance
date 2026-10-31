import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";

import { allocationHistory, allocationSeries } from "./allocationHistory";

const state: AppState = {
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_STATE.settings, rates: { USD: 40, EUR: 45 } },
  savings: [
    { id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 1000 },
    { id: "usd", name: "Dollars", icon: "💵", kind: "cash", currency: "USD", openingBalance: 0 },
  ],
  transactions: [
    {
      id: "buy",
      type: "transfer",
      amount: 800,
      currency: "UAH",
      categoryId: "",
      date: "2026-09-10",
      accountId: "card",
      toAccountId: "usd",
      toAmount: 20,
    },
  ],
};

describe("allocationHistory", () => {
  it("splits the assets of each month end by kind or currency", () => {
    const byKind = allocationHistory(state, "2026-10-15", 3, "kind");
    expect(byKind.map((month) => [month.month, month.total])).toEqual([
      ["2026-08", 1000],
      ["2026-09", 1000],
      ["2026-10", 1000],
    ]);
    expect(byKind[0]?.parts.map((part) => part.id)).toEqual(["acc:card"]);
    expect(byKind[1]?.parts.map((part) => [part.id, part.base])).toEqual([
      ["acc:cash", 800],
      ["acc:card", 200],
    ]);
    const byCurrency = allocationHistory(state, "2026-10-15", 2, "currency");
    expect(byCurrency[1]?.parts.map((part) => part.id)).toEqual(["USD", "UAH"]);
    expect(allocationSeries(byKind).map((part) => part.id)).toEqual(["acc:cash", "acc:card"]);
  });
});
