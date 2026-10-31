import { describe, expect, it } from "vitest";

import { setAmountsHidden } from "@/shared/lib/money";

import {
  axisFormatter,
  chartSpan,
  flowStart,
  niceRange,
  niceTicks,
  seriesColor,
  TONE_COLOR,
  trendStart,
} from "./chart";

// The lengths of the periods offered for a history
const months = (history: number) => chartSpan(history, 36).periods.map((period) => period.months);

describe("chart", () => {
  it("picks round steps that reach the maximum", () => {
    expect(niceTicks(0)).toEqual([0, 1]);
    expect(niceTicks(80_000)).toEqual([0, 20_000, 40_000, 60_000, 80_000]);
    expect(niceTicks(9)).toEqual([0, 2.5, 5, 7.5, 10]);
    expect(niceTicks(610_000)).toEqual([0, 200_000, 400_000, 600_000, 800_000]);
  });

  it("hugs a range above zero with round steps and a margin", () => {
    const ticks = niceRange(515_000, 536_000);
    expect(ticks[0]).toBeLessThan(515_000);
    expect(ticks[0]).toBeGreaterThan(400_000);
    expect(ticks.at(-1)).toBeGreaterThan(536_000);
    expect(niceRange(10, 20)).toEqual([5, 10, 15, 20, 25]);
  });

  it("writes axis labels in thousands or millions", () => {
    expect(axisFormatter(80_000)(20_000)).toBe("20K");
    expect(axisFormatter(80_000)(2500)).toBe("2.5K");
    expect(axisFormatter(5_000_000)(1_500_000)).toBe("1.5M");
    expect(axisFormatter(900)(250)).toBe("250");
    expect(axisFormatter(900)(0)).toBe("0");
  });

  it("writes dots for axis labels while amounts are hidden", () => {
    setAmountsHidden(true);
    try {
      expect(axisFormatter(80_000)(20_000)).toBe("••••");
      expect(axisFormatter(80_000)(0)).toBe("0");
    } finally {
      setAmountsHidden(false);
    }
  });

  it("offers only the periods a history fills and drops the empty months before it", () => {
    expect(months(0)).toEqual([6]);
    expect(months(7)).toEqual([6, 12]);
    expect(months(13)).toEqual([6, 12, 24]);
    expect(months(40)).toEqual([6, 12, 24, 36]);
    expect(chartSpan(3, 12)).toMatchObject({ value: 6, months: 6 });
    expect(chartSpan(7, 24)).toMatchObject({ value: 12, months: 7 });
    expect(chartSpan(30, 12)).toMatchObject({ value: 12, months: 12 });
  });

  it("cuts a trend's flat lead-in but its last month, keeping six months or more", () => {
    expect(trendStart([5, 5, 5, 5, 5, 5, 5, 5, 7, 9, 8, 6])).toBe(6);
    expect(trendStart([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4])).toBe(6);
    expect(trendStart([1, 2, 3, 4, 5, 6, 7, 8])).toBe(0);
    expect(trendStart([3, 3, 3])).toBe(0);
  });

  it("wraps series colours past the palette", () => {
    expect(seriesColor(1)).toBe("var(--series-1)");
    expect(seriesColor(15)).toBe("var(--series-1)");
    expect(TONE_COLOR.expense).toBe("var(--color-expense)");
  });
});

describe("flowStart", () => {
  it("starts a flow at its first month with money, keeping two points", () => {
    expect(flowStart([0, 0, 0, 70, 62, 74])).toBe(3);
    expect(flowStart([0, 0, 0, 0, 0, 4])).toBe(4);
    expect(flowStart([0, 0, 0])).toBe(1);
    expect(flowStart([5])).toBe(0);
  });
});
