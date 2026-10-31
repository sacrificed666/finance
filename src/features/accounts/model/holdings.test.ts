import { describe, expect, it } from "vitest";

import { holdingDrafts, holdingsSummary, pricedDrafts } from "./holdings";

describe("holdings", () => {
  it("lists the coins in one line", () => {
    expect(
      holdingsSummary([
        { coin: "bitcoin", quantity: 0.5 },
        { coin: "unknown-coin", quantity: 2 },
      ]),
    ).toBe("0.5 BTC · 2 UNKNOWN-COIN");
    expect(holdingsSummary([])).toBe("");
  });

  it("turns the coins into form rows and prices them", () => {
    const drafts = holdingDrafts([{ coin: "bitcoin", quantity: 0.5 }], () => "k");
    expect(drafts).toEqual([{ key: "k", coin: "bitcoin", quantity: "0.5" }]);
    const quotes = new Map([["USD:bitcoin", { price: 60000, icon: "b.png" }]]);
    expect(pricedDrafts(drafts, quotes, "USD")[0]).toMatchObject({ price: 60000, icon: "b.png" });
    expect(pricedDrafts(drafts, quotes, "EUR")[0]?.price).toBeUndefined();
  });
});
