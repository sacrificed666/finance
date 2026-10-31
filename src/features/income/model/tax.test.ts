import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";

import { esvMinimum, regimeAnnualHeadroom, taxRegime, taxYearValues } from "./tax";
import {
  declarationFigures,
  incomeBook,
  incomeBookCsv,
  recordTaxPayments,
  taxDeducted,
  taxObligations,
  type RateOf,
} from "./taxCalendar";

// A part of a regime's tax in a year
const part = (id: Parameters<typeof taxRegime>[0], component: string, year: number) =>
  taxRegime(id, year).components.find((c) => c.id === component);

describe("tax figures per year", () => {
  it("matches the published 2025 figures", () => {
    expect(esvMinimum(2025)).toBe(1760);
    expect(part("fop1", "single", 2025)?.fixedUAH).toBe(302.8);
    expect(part("fop2", "single", 2025)?.fixedUAH).toBe(1600);
    expect(part("fop2", "levy", 2025)?.fixedUAH).toBe(800);
    expect(taxRegime("fop1", 2025).annualLimitUAH).toBe(1_336_000);
    expect(taxRegime("fop2", 2025).annualLimitUAH).toBe(6_672_000);
    expect(taxRegime("fop3", 2025).annualLimitUAH).toBe(9_336_000);
  });

  it("matches the 2026 figures, with the group 3 limit at 1167 minimum wages", () => {
    expect(esvMinimum(2026)).toBe(1902.34);
    expect(part("fop1", "single", 2026)?.fixedUAH).toBe(332.8);
    expect(part("fop2", "single", 2026)?.fixedUAH).toBe(1729.4);
    expect(part("fop2", "levy", 2026)?.fixedUAH).toBe(864.7);
    expect(taxRegime("fop1", 2026).annualLimitUAH).toBe(1_444_049);
    expect(taxRegime("fop2", 2026).annualLimitUAH).toBe(7_211_598);
    expect(taxRegime("fop3", 2026).annualLimitUAH).toBe(10_091_049);
  });

  it("stands in the nearest known year for one not in the table, and says so", () => {
    expect(taxYearValues(2027)).toMatchObject({ year: 2026, known: false });
    expect(taxYearValues(2026).known).toBe(true);
    expect(taxRegime("fop3", 2027).annualLimitUAH).toBe(taxRegime("fop3", 2026).annualLimitUAH);
  });

  it("measures the limit of the year asked for", () => {
    expect(regimeAnnualHeadroom("fop3", 4_668_000, 2025)?.pct).toBe(50);
    expect(regimeAnnualHeadroom("none", 1_000)).toBeNull();
  });
});

// The default data under a tax regime
const state = (regime: AppState["settings"]["tax"]["regime"]): AppState => ({
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_STATE.settings, tax: { ...DEFAULT_STATE.settings.tax, regime } },
});

// The third group's data with some entries
const fop3 = (transactions: AppState["transactions"]): AppState => ({
  ...DEFAULT_STATE,
  transactions,
  settings: { ...DEFAULT_STATE.settings, tax: { ...DEFAULT_STATE.settings.tax, regime: "fop3" } },
});

// An invoice taxed by the third group
const income = (id: string, date: string, gross: number, currency: "UAH" | "USD" = "UAH") => ({
  id,
  type: "income" as const,
  amount: gross * 0.94,
  currency,
  categoryId: "cat-freelance",
  date,
  note: `Invoice ${id}`,
  tax: { regime: "fop3" as const, ratePct: 6, fixedUAH: 0, vatPct: 0, gross },
});

// The dollar's NBU rate: 41 on one day, 42 on the others
const usd: RateOf = (_currency, date) => (date === "2026-02-10" ? 41 : 42);

describe("tax calendar", () => {
  it("charges each year's ЄСВ minimum for its quarters", () => {
    const esv2025 = taxObligations(state("fop3"), 2025).find((o) => o.id === "2025-Q1:esv");
    const esv2026 = taxObligations(state("fop3"), 2026).find((o) => o.id === "2026-Q1:esv");
    expect(esv2025?.amount).toBeCloseTo(5280, 2);
    expect(esv2026?.amount).toBeCloseTo(5707.02, 2);
  });

  it("moves a weekend deadline to Monday", () => {
    const advance = taxObligations(state("fop2"), 2026).find((o) => o.id === "2026-09:single");
    expect(advance?.due).toBe("2026-09-21");
  });
});

describe("tax payments, the income book and the declaration", () => {
  it("books a paid obligation as a tax expense and takes it back when unmarked", () => {
    const s = fop3([]);
    const o = taxObligations(s, 2026).find((x) => x.id === "2026-Q1:esv")!;
    const paid = recordTaxPayments(s, [o], true, "2026-04-15", () => "ЄСВ · Q1");
    expect(paid.settings.taxPaid?.["2026-Q1:esv"]).toBe("2026-04-15");
    expect(paid.transactions).toEqual([
      expect.objectContaining({
        id: "tax:2026-Q1:esv",
        type: "expense",
        amount: 5707.02,
        categoryId: "cat-taxes",
        note: "ЄСВ · Q1",
      }),
    ]);
    const undone = recordTaxPayments(paid, [o], false, "2026-04-15", () => "");
    expect(undone.transactions).toEqual([]);
    expect(undone.settings.taxPaid?.["2026-Q1:esv"]).toBeUndefined();
  });

  it("marks a tax paid on its day without an expense when income already had it taken off", () => {
    const untaxed = fop3([]);
    const o = taxObligations(untaxed, 2026).find((x) => x.id === "2026-Q1:esv")!;
    expect(taxDeducted(untaxed, o)).toBe(false);
    const taxed = fop3([income("a", "2026-01-05", 20_000)]);
    expect(taxDeducted(taxed, o)).toBe(true);
    const paid = recordTaxPayments(taxed, [o], true, "2026-04-02", () => "ЄСВ · Q1", false);
    expect(paid.settings.taxPaid?.["2026-Q1:esv"]).toBe("2026-04-02");
    expect(paid.transactions.some((tx) => tx.id === "tax:2026-Q1:esv")).toBe(false);
  });

  it("lists income in hryvnias at the rate of its day, oldest first, and writes it for a spreadsheet", () => {
    const s = fop3([income("b", "2026-02-10", 1000, "USD"), income("a", "2026-01-05", 20_000)]);
    const book = incomeBook(s, 2026, usd);
    expect(book.map((r) => [r.date, r.uah])).toEqual([
      ["2026-01-05", 20_000],
      ["2026-02-10", 41_000],
    ]);
    const csv = incomeBookCsv(book);
    expect(csv.startsWith("﻿Дата;Сума доходу, грн")).toBe(true);
    expect(csv).toContain("10.02.2026;41000,00;Invoice b;1000,00;USD;41,0000");
    expect(csv).toContain("Разом;61000,00");
  });

  it("counts a group 3 declaration from 1 January and shows what the quarter adds", () => {
    const s = fop3([income("a", "2026-02-01", 100_000), income("b", "2026-05-01", 50_000)]);
    const q2 = declarationFigures(s, 2026, 2, usd)!;
    expect(q2.incomeToDate).toBe(150_000);
    expect(q2.singleToDate).toBe(7500);
    expect(q2.levyToDate).toBe(1500);
    expect(q2.singleThisQuarter).toBe(2500);
    expect(q2.levyThisQuarter).toBe(500);
  });
});
