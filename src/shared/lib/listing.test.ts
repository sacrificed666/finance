import { describe, expect, it } from "vitest";

import { matchesQuery, oneOf, sortItems } from "./listing";

describe("listing", () => {
  it("sorts numbers by value and text by collation in both directions", () => {
    const items = [
      { amount: 30, name: "b" },
      { amount: 5, name: "a" },
      { amount: 12, name: "c" },
    ];
    expect(sortItems(items, (item) => item.amount, "asc").map((item) => item.amount)).toEqual([5, 12, 30]);
    expect(sortItems(items, (item) => item.name, "desc").map((item) => item.name)).toEqual(["c", "b", "a"]);
    expect(items[0]?.amount).toBe(30);
  });

  it("finds the search text in any field, ignoring case and blanks", () => {
    expect(matchesQuery("  ", "anything")).toBe(true);
    expect(matchesQuery("SILPO", "Groceries", "Silpo")).toBe(true);
    expect(matchesQuery("rent", null, undefined, "Salary")).toBe(false);
  });

  it("checks stored values against the allowed ones", () => {
    const isSort = oneOf(["date", "amount"] as const);
    expect(isSort("date")).toBe(true);
    expect(isSort("name")).toBe(false);
    expect(isSort(3)).toBe(false);
  });
});
