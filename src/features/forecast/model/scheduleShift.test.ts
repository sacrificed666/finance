import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import { bookingsInMonth } from "@/features/data/model/frequency";
import type { AppState, RecurringRule } from "@/features/data/model/types";

import { scheduledNet, scheduleShift } from "./scheduleShift";

// A monthly expense rule from a month on
const rule = (id: string, over: Partial<RecurringRule>): RecurringRule => ({
  id,
  type: "expense",
  amount: 1000,
  currency: "UAH",
  categoryId: "cat-housing",
  dayOfMonth: 5,
  startMonth: "2026-01",
  ...over,
});

describe("scheduleShift", () => {
  it("counts weekly bookings per month and nothing outside a span", () => {
    const weekly = rule("w", { period: "weekly", startMonth: "2026-10", dayOfMonth: 1 });
    expect(bookingsInMonth(weekly, "2026-10")).toBe(5);
    expect(bookingsInMonth(weekly, "2026-11")).toBe(4);
    expect(bookingsInMonth(weekly, "2026-09")).toBe(0);
    expect(bookingsInMonth(rule("q", { period: "quarterly" }), "2026-04")).toBe(1);
    expect(bookingsInMonth(rule("q", { period: "quarterly" }), "2026-05")).toBe(0);
  });

  it("adds back what an ending instalment took and takes off what a new rule will", () => {
    const state: AppState = {
      ...DEFAULT_STATE,
      recurring: [
        rule("rent", {}),
        rule("phone", { amount: 600, endMonth: "2026-12", instalment: { total: 7200, count: 12 } }),
        rule("gym", { amount: 300, startMonth: "2027-02" }),
      ],
      transactions: ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"].map((month) => ({
        id: `pay-${month}`,
        type: "income" as const,
        amount: 5000,
        currency: "UAH" as const,
        categoryId: "cat-salary",
        date: `${month}-01`,
      })),
    };
    expect(scheduledNet(state, "2026-10")).toBe(-1600);
    const shift = scheduleShift(state, "2026-11");
    expect(shift("2026-12")).toBe(0);
    expect(shift("2027-01")).toBe(600);
    expect(shift("2027-02")).toBe(300);
  });

  it("sets the schedules against the same months the average of what is kept counts", () => {
    const state: AppState = {
      ...DEFAULT_STATE,
      recurring: [rule("rent", { startMonth: "2026-07" })],
      transactions: ["2026-07", "2026-08", "2026-09", "2026-10"].map((month) => ({
        id: `rent-${month}`,
        type: "expense" as const,
        amount: 1000,
        currency: "UAH" as const,
        categoryId: "cat-housing",
        date: `${month}-05`,
        recurringId: "rent",
      })),
    };
    expect(scheduleShift(state, "2026-11")("2026-12")).toBe(0);
    expect(scheduleShift(DEFAULT_STATE, "2026-11")("2026-12")).toBe(0);
  });
});
