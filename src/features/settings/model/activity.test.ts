import { describe, expect, it } from "vitest";

import type { Transaction } from "@/features/data/model/types";

import { entryActivity } from "./activity";

// An expense on a date
const entry = (date: string): Transaction => ({
  id: date,
  type: "expense",
  amount: 1,
  currency: "UAH",
  categoryId: "c",
  date,
});

describe("entryActivity", () => {
  it("counts a short history over six months and averages only the tracked ones", () => {
    const activity = entryActivity([entry("2026-09-03"), entry("2026-10-01"), entry("2026-10-02")], "2026-10");
    expect(activity).toMatchObject({ first: "2026-09-03", from: "2026-05", values: [0, 0, 0, 0, 1, 2] });
    expect(activity.average).toBe(1.5);
  });

  it("keeps to the last year of a long history", () => {
    const activity = entryActivity([entry("2024-01-10"), entry("2026-10-05")], "2026-10");
    expect(activity.from).toBe("2025-11");
    expect(activity.values).toHaveLength(12);
    expect(activity.average).toBeCloseTo(1 / 12);
  });

  it("has nothing to count without entries", () => {
    expect(entryActivity([], "2026-10")).toMatchObject({ first: null, values: [0, 0, 0, 0, 0, 0], average: 0 });
  });
});
