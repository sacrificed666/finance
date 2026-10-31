import { describe, expect, it } from "vitest";

import { categoryName } from "@/features/data/model/categoryName";
import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";
import { en } from "@/shared/i18n/messages/en";
import { uk } from "@/shared/i18n/messages/uk";
import { makeI18n } from "@/shared/i18n/translate";

import { csvStyle, journalCsv, reportCsv } from "./export";

const EN = makeI18n("en", en);
const UK = makeI18n("uk", uk);

// The lines of a file without its byte order mark
const rows = (csv: string) =>
  csv
    .replace(/^\uFEFF/u, "")
    .trimEnd()
    .split("\r\n");

const state: AppState = {
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_STATE.settings, baseCurrency: "UAH", rates: { USD: 41.5, EUR: 48 } },
  savings: [
    { id: "card", name: "Mono; black", icon: "💳", kind: "card", currency: "UAH", openingBalance: 0 },
    { id: "cash", name: "Cash", icon: "💵", kind: "cash", currency: "USD", openingBalance: 0 },
  ],
};

const foodCat = state.categories.find((c) => c.id === "cat-food");
const foodParent = foodCat?.parentId ? state.categories.find((c) => c.id === foodCat.parentId) : undefined;
const food = foodParent ? `${categoryName(EN, foodParent)} › ${categoryName(EN, foodCat)}` : categoryName(EN, foodCat);

// An expense with the given fields
const tx = (over: Partial<Transaction>): Transaction => ({
  id: "t",
  type: "expense",
  amount: 100,
  currency: "UAH",
  categoryId: "cat-food",
  date: "2026-09-10",
  ...over,
});

describe("csvStyle", () => {
  it("uses the separator spreadsheets expect with each language's decimal mark", () => {
    expect(csvStyle("en-GB")).toEqual({ separator: ",", decimal: "." });
    expect(csvStyle("uk-UA")).toEqual({ separator: ";", decimal: "," });
    expect(csvStyle("de-DE")).toEqual({ separator: ";", decimal: "," });
  });
});

describe("journalCsv", () => {
  it("writes one row per entry in date order, signed, with the base amount beside it", () => {
    const csv = journalCsv(
      state,
      [
        tx({
          id: "b",
          date: "2026-09-12",
          type: "income",
          amount: 1000,
          currency: "USD",
          accountId: "cash",
          note: 'Invoice "42"',
        }),
        tx({ id: "a", accountId: "card", note: "Lunch", tags: ["work", "team"] }),
        tx({
          id: "c",
          date: "2026-10-01",
          type: "transfer",
          amount: 50,
          currency: "USD",
          accountId: "cash",
          toAccountId: "card",
        }),
      ],
      EN,
      "2026-09-20",
    );
    const lines = rows(csv);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(lines[0]).toBe('Date,Type,Amount,Currency,"Amount, UAH",Category,Account,To account,Note,Tags,Planned');
    expect(lines[1]).toBe(`2026-09-10,Expense,-100.00,UAH,-100.00,${food},Mono; black,,Lunch,"work, team",`);
    expect(lines[2]).toBe(`2026-09-12,Income,1000.00,USD,41500.00,${food},Cash,,"Invoice ""42""",,`);
    expect(lines[3]).toBe("2026-10-01,Transfer,50.00,USD,2075.00,,Cash,Mono; black,,,yes");
  });

  it("follows the language: semicolons, decimal commas, translated headers", () => {
    const lines = rows(journalCsv(state, [tx({ accountId: "card", amount: 12.5 })], UK, "2026-09-20"));
    expect(lines[0]!.split(";").slice(0, 5)).toEqual(["Дата", "Тип", "Сума", "Валюта", "Сума, UAH"]);
    expect(lines[1]).toContain(";-12,50;UAH;-12,50;");
    expect(lines[1]).toContain(';"Mono; black";');
  });
});

describe("reportCsv", () => {
  it("puts both periods and the change side by side, then the totals", () => {
    const csv = reportCsv(
      [
        { label: "Food", current: 5000, previous: 4200.5 },
        { label: "Rent", current: 14000, previous: 14000 },
      ],
      {
        income: { label: "Income", current: 60000, previous: 58000 },
        expense: { label: "Spending", current: 19000, previous: 18200.5 },
        net: { label: "Net result", current: 41000, previous: 39799.5 },
      },
      { current: "September 2026", previous: "August 2026" },
      "UAH",
      EN,
    );
    expect(rows(csv)).toEqual([
      'Category,"September 2026, UAH","August 2026, UAH",Change',
      "Food,5000.00,4200.50,799.50",
      "Rent,14000.00,14000.00,0.00",
      "",
      "Income,60000.00,58000.00,2000.00",
      "Spending,19000.00,18200.50,799.50",
      "Net result,41000.00,39799.50,1200.50",
    ]);
  });
});
