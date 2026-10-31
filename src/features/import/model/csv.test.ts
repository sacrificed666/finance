import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";

import { candidatesFromCsv, csvDraft, decodeCsv, guessMapping, parseCsv, parseDate, parseNumber } from "./csv";

// The columns a plain bank statement does not have
const NO_EXTRA = { category: -1, account: -1, currency: -1, type: -1, payee: -1 };

describe("parseCsv", () => {
  it("guesses the delimiter and keeps quoted cells whole", () => {
    expect(parseCsv('date;amount;note\r\n01.10.2026;-100,50;"Coffee; to go"\r\n')).toEqual([
      ["date", "amount", "note"],
      ["01.10.2026", "-100,50", "Coffee; to go"],
    ]);
  });
});

describe("numbers and dates", () => {
  it("reads amounts and dates the way banks write them", () => {
    expect(parseNumber("−1 234,50")).toBe(-1234.5);
    expect(parseNumber("1,234.50")).toBe(1234.5);
    expect(Number.isNaN(parseNumber("abc"))).toBe(true);
    expect(parseDate("2026-10-01 12:00")).toBe("2026-10-01");
    expect(parseDate("1.10.26")).toBe("2026-10-01");
    expect(parseDate("yesterday")).toBeNull();
  });

  it("reads a month-first date and leaves out days no calendar has", () => {
    expect(parseDate("10/30/2026")).toBe("2026-10-30");
    expect(parseDate("31.02.2026")).toBeNull();
    expect(parseDate("2026-13-01")).toBeNull();
    expect(parseDate("29.02.2028")).toBe("2028-02-29");
  });
});

describe("guessMapping and csvDraft", () => {
  it("finds the columns by their titles", () => {
    expect(guessMapping(["Дата", "Деталі операції", "MCC", "Сума в валюті картки"])).toMatchObject({
      date: 0,
      description: 1,
      mcc: 2,
      amount: 3,
    });
    expect(csvDraft("only-header.csv", "date,amount\n")).toBeNull();
    expect(csvDraft("s.csv", "date,amount\n2026-10-01,5\n")).toMatchObject({
      name: "s.csv",
      rows: [["2026-10-01", "5"]],
    });
  });

  it("turns rows into entries and skips the empty ones", () => {
    const found = candidatesFromCsv(
      DEFAULT_STATE,
      [
        ["2026-10-01", "-100", "Silpo"],
        ["2026-10-02", "0", "Nothing"],
        ["bad", "5", "Broken"],
      ],
      { date: 0, amount: 1, description: 2, debit: -1, mcc: -1, ...NO_EXTRA },
      "UAH",
    );
    expect(found).toEqual([
      expect.objectContaining({ date: "2026-10-01", type: "expense", amount: 100, description: "Silpo" }),
    ]);
  });

  it("gives the same purchase made twice a day an id of its own", () => {
    const mapping = { date: 0, amount: 1, description: 2, debit: -1, mcc: -1, ...NO_EXTRA };
    const row = ["2026-10-01", "-8", "Metro"];
    const [first, second] = candidatesFromCsv(DEFAULT_STATE, [row, row], mapping, "UAH");
    const [alone] = candidatesFromCsv(DEFAULT_STATE, [row], mapping, "UAH");
    expect(first?.externalId).toBe(alone?.externalId);
    expect(second?.externalId).not.toBe(first?.externalId);
  });
});

describe("decodeCsv", () => {
  it("reads UTF-8 and falls back to Windows-1251", () => {
    expect(decodeCsv(new TextEncoder().encode("Кава").buffer)).toBe("Кава");
    expect(decodeCsv(new Uint8Array([0xca, 0xe0, 0xe2, 0xe0]).buffer)).toBe("Кава");
  });
});

describe("exports of other apps", () => {
  const state: AppState = {
    ...DEFAULT_STATE,
    savings: [{ id: "cash", name: "Cash", icon: "💵", kind: "cash", currency: "UAH", openingBalance: 0 }],
  };

  it("finds the columns of Monefy, Spendee and Wallet, and leaves a bank's currency column alone", () => {
    expect(
      guessMapping([
        "date",
        "account",
        "category",
        "amount",
        "currency",
        "converted amount",
        "currency",
        "description",
      ]),
    ).toMatchObject({
      date: 0,
      account: 1,
      category: 2,
      amount: 3,
      currency: 4,
      description: 7,
    });
    expect(guessMapping(["Date", "Wallet", "Type", "Category name", "Amount", "Currency", "Note"])).toMatchObject({
      account: 1,
      type: 2,
      category: 3,
      amount: 4,
      currency: 5,
      description: 6,
    });
    expect(guessMapping(["account", "category", "currency", "amount", "type", "note", "date", "payee"])).toMatchObject({
      payee: 7,
      type: 4,
    });
    expect(guessMapping(["Дата", "Деталі", "Сума в валюті картки (UAH)", "Валюта"]).currency).toBe(-1);
  });

  it("files rows by their category and account names, signs them by type and skips transfers", () => {
    const mapping = {
      date: 0,
      amount: 1,
      description: 2,
      debit: -1,
      mcc: -1,
      category: 3,
      account: 4,
      currency: 5,
      type: 6,
      payee: 7,
    };
    const found = candidatesFromCsv(
      state,
      [
        ["2026-10-01", "150", "", "Groceries", "cash", "uah", "Expense", "Silpo"],
        ["2026-10-02", "2000", "Bonus", "Salary", "Bank", "USD", "Income", ""],
        ["2026-10-03", "500", "To savings", "", "Cash", "UAH", "Transfer", ""],
      ],
      mapping,
      "UAH",
      (category) => (category.id === "cat-groceries" ? "Groceries" : category.name),
    );
    expect(found).toEqual([
      expect.objectContaining({
        type: "expense",
        amount: 150,
        description: "Silpo",
        categoryId: "cat-groceries",
        accountId: "cash",
        currency: "UAH",
      }),
      expect.objectContaining({ type: "income", amount: 2000, currency: "USD" }),
    ]);
    expect(found[1]?.accountId).toBeUndefined();
  });
});
