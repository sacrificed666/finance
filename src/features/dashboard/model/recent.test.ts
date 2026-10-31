import { describe, expect, it } from "vitest";

import type { Transaction } from "@/features/data/model/types";

import { recentEntries } from "./recent";

// An expense on a date
const entry = (id: string, date: string): Transaction => ({
  id,
  type: "expense",
  amount: 1,
  currency: "UAH",
  categoryId: "c",
  date,
});

describe("recentEntries", () => {
  it("lists the newest entries up to today, the last logged first within a day", () => {
    const txs = [
      entry("a", "2026-10-01"),
      entry("b", "2026-10-09"),
      entry("c", "2026-10-30"),
      entry("d", "2026-10-09"),
    ];
    expect(recentEntries(txs, "2026-10-10", 2).map((tx) => tx.id)).toEqual(["d", "b"]);
    expect(recentEntries(txs, "2026-10-10", 5).map((tx) => tx.id)).toEqual(["d", "b", "a"]);
  });
});
