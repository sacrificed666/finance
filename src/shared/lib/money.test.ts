import { describe, expect, it } from "vitest";

import { setFormatLocale } from "@/shared/i18n/format";

import { formatCompact, formatMoney, isSum, parseAmount, setAmountsHidden } from "./money";

describe("formatCompact", () => {
  it("shortens from ten thousand, or from a thousand when tight", () => {
    expect(formatCompact(2025)).toBe("2,025");
    expect(formatCompact(2025, true)).toBe("2K");
    expect(formatCompact(-16_500)).toBe("−16.5K");
    expect(formatCompact(1_250_000)).toBe("1.3M");
    expect(formatCompact(999_999)).toBe("1M");
    expect(formatCompact(999_940)).toBe("999.9K");
  });
});

describe("formatMoney", () => {
  it("puts the hryvnia after the figure and the dollar before it", () => {
    expect(formatMoney(2025, "UAH", { compact: true, tight: true })).toBe("2K ₴");
    expect(formatMoney(-12.5, "USD", { sign: true })).toBe("−$12.50");
    expect(formatMoney(40, "EUR", { sign: true })).toBe("+€40");
  });
});

describe("hidden amounts", () => {
  it("writes dots for every figure and keeps the sign and currency", () => {
    setAmountsHidden(true);
    try {
      expect(formatMoney(1234, "UAH")).toBe("••••\u00A0₴");
      expect(formatMoney(-5, "USD")).toBe("−$••••");
      expect(formatMoney(40, "EUR", { sign: true, compact: true })).toBe("+€••••");
      expect(formatCompact(52_000)).toBe("••••");
    } finally {
      setAmountsHidden(false);
    }
    expect(formatMoney(1234, "UAH")).toBe("1,234\u00A0₴");
  });
});

describe("parseAmount", () => {
  it("reads either decimal mark and any grouping, and an empty field as nothing", () => {
    expect(parseAmount("1 234,56")).toBe(1234.56);
    expect(parseAmount("1,234.56")).toBe(1234.56);
    expect(parseAmount("−5")).toBe(-5);
    expect(parseAmount("")).toBe(0);
    expect(parseAmount("abc")).toBeNaN();
  });

  it("reads one mark as thousands where the page language groups with it", () => {
    expect(parseAmount("1,500")).toBe(1500);
    expect(parseAmount("1,5")).toBe(1.5);
    expect(parseAmount("1.500")).toBe(1.5);
    expect(parseAmount("1,000,000")).toBe(1_000_000);
    expect(parseAmount("1,2,3")).toBeNaN();
    setFormatLocale("de-DE");
    expect(parseAmount("1.500")).toBe(1500);
    expect(parseAmount("1,500")).toBe(1.5);
    setFormatLocale("uk-UA");
    expect(parseAmount("1,500")).toBe(1.5);
    expect(parseAmount("1.000.000")).toBe(1_000_000);
    setFormatLocale("en-GB");
  });

  it("works sums out, multiplying and dividing first", () => {
    expect(parseAmount("120+45-10")).toBe(155);
    expect(parseAmount("3×85")).toBe(255);
    expect(parseAmount("100 − 2 * 10")).toBe(80);
    expect(parseAmount("12,5+7,5")).toBe(20);
    expect(parseAmount("90÷4")).toBe(22.5);
    expect(parseAmount("5*-2")).toBe(-10);
    expect(parseAmount("5+")).toBeNaN();
    expect(parseAmount("5/0")).toBeNaN();
    expect(parseAmount("*5")).toBeNaN();
  });

  it("tells a sum from a plain amount", () => {
    expect(isSum("120+45")).toBe(true);
    expect(isSum("-120")).toBe(false);
    expect(isSum("1 234,50")).toBe(false);
  });
});
