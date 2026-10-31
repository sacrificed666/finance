import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { Transaction } from "@/features/data/model/types";

import { topPlaces } from "./places";

// An entry with a note in a month
const entry = (id: string, note: string | undefined, amount: number, date = "2026-10-05"): Transaction => ({
  id,
  type: "expense",
  amount,
  currency: "UAH",
  categoryId: "cat-food",
  date,
  note,
});

describe("topPlaces", () => {
  it("adds the month's expenses up by their note, whatever its case, the costliest first", () => {
    const state = {
      ...DEFAULT_STATE,
      transactions: [
        entry("a", "Silpo", 300),
        entry("b", " silpo ", 200),
        entry("c", "Uklon", 900),
        entry("d", undefined, 5000),
        entry("e", "Silpo", 999, "2026-09-30"),
        { ...entry("f", "Salary", 9000), type: "income" as const },
      ],
    };
    expect(topPlaces(state, "2026-10")).toEqual([
      { key: "uklon", name: "Uklon", total: 900, count: 1 },
      { key: "silpo", name: "Silpo", total: 500, count: 2 },
    ]);
    expect(topPlaces(state, "2026-10", 1)).toHaveLength(1);
  });
});
