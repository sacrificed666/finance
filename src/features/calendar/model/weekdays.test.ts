import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { Transaction } from "@/features/data/model/types";

import { todayWeekday, weekdaySpending } from "./weekdays";

// A spend in hryvnias on a day
const spend = (id: string, date: string, amount: number, type: Transaction["type"] = "expense"): Transaction => ({
  id,
  type,
  amount,
  currency: "UAH",
  categoryId: "cat-food",
  date,
});

describe("weekdaySpending", () => {
  it("averages each weekday's spending over the weeks, Monday first, leaving income and the future out", () => {
    const state = {
      ...DEFAULT_STATE,
      transactions: [
        spend("mon", "2026-10-26", 120),
        spend("sat", "2026-10-24", 600),
        spend("sat2", "2026-10-17", 600),
        spend("pay", "2026-10-24", 9000, "income"),
        spend("later", "2026-10-31", 5000),
        spend("old", "2026-01-03", 5000),
      ],
    };
    const days = weekdaySpending(state, "2026-10-28", 2);
    expect(days[0]).toEqual({ weekday: 0, average: 60 });
    expect(days[5]).toEqual({ weekday: 5, average: 600 });
    expect(days.reduce((sum, day) => sum + day.average, 0)).toBe(660);
    expect(todayWeekday("2026-10-28")).toBe(2);
  });
});
