import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";

import { dailySpending, runningTotal, spendingPace } from "./pace";

// An expense in hryvnias on a day
const spend = (amount: number, date: string): Transaction => ({
  id: `${date}:${String(amount)}`,
  type: "expense",
  amount,
  currency: "UAH",
  categoryId: "cat-groceries",
  date,
});

const state: AppState = {
  ...DEFAULT_STATE,
  transactions: [spend(100, "2026-09-01"), spend(300, "2026-09-03"), spend(50, "2026-10-01"), spend(70, "2026-10-02")],
};

describe("runningTotal", () => {
  it("adds every day to the ones before", () => {
    expect(runningTotal([1, 2, 0, 4])).toEqual([1, 3, 3, 7]);
    expect(runningTotal([])).toEqual([]);
  });
});

describe("dailySpending", () => {
  it("gives the spending of each of the first days", () => {
    expect(dailySpending(state, "2026-09", 3)).toEqual([100, 0, 300]);
  });
});

describe("spendingPace", () => {
  it("runs this month up to today against the whole month before", () => {
    const pace = spendingPace(state, "2026-10", "2026-10-02");
    expect(pace.elapsed).toBe(2);
    expect(pace.current).toEqual([50, 120]);
    expect(pace.previous).toHaveLength(30);
    expect(pace.soFar).toBe(120);
    expect(pace.previousAtSameDay).toBe(100);
  });

  it("takes all of a past month and none of a future one", () => {
    expect(spendingPace(state, "2026-09", "2026-10-02").elapsed).toBe(30);
    expect(spendingPace(state, "2026-11", "2026-10-02")).toMatchObject({ elapsed: 0, soFar: 0, previousAtSameDay: 0 });
  });
});
