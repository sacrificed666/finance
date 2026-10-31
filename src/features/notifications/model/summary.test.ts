import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";
import { en } from "@/shared/i18n/messages/en";
import { makeI18n } from "@/shared/i18n/translate";

import { summaryMessage, summarySpans } from "./summary";

const EN = makeI18n("en", en);

// An entry in hryvnias
const tx = (id: string, over: Partial<Transaction>): Transaction => ({
  id,
  type: "expense",
  amount: 100,
  currency: "UAH",
  categoryId: "cat-groceries",
  date: "2026-10-20",
  ...over,
});

const state: AppState = {
  ...DEFAULT_STATE,
  transactions: [
    tx("food", { amount: 800, date: "2026-10-21" }),
    tx("taxi", { categoryId: "cat-taxi", amount: 400, date: "2026-10-24" }),
    tx("pay", { type: "income", categoryId: "cat-salary", amount: 30000, date: "2026-10-22" }),
    tx("left out", { amount: 9000, date: "2026-10-23", excluded: true }),
    tx("week before", { amount: 2000, date: "2026-10-15" }),
    tx("september", { amount: 500, date: "2026-09-10" }),
  ],
};

describe("summaries", () => {
  it("look back on the last week on Mondays and the last month on the 1st", () => {
    expect(summarySpans("weekly", "2026-10-26")?.current).toEqual({ from: "2026-10-19", to: "2026-10-25" });
    expect(summarySpans("weekly", "2026-10-27")).toBeNull();
    expect(summarySpans("monthly", "2026-11-01")?.current).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(summarySpans("monthly", "2026-11-02")).toBeNull();
  });

  it("sum up the week against the one before, with what came in and the top category", () => {
    expect(summaryMessage(state, "2026-10-26", "weekly", EN)).toEqual({
      title: "Your week in short",
      body: "Spent 1,200\u00A0₴ · 40% less than the week before\nEarned 30,000\u00A0₴\nMost on Food: 800\u00A0₴",
      url: "/reports",
      tag: "summary-weekly-2026-10-25",
    });
  });

  it("sum up a month, and stay quiet when nothing moved", () => {
    expect(summaryMessage(state, "2026-11-01", "monthly", EN)?.title).toBe("October 2026 in short");
    expect(summaryMessage(state, "2026-11-01", "monthly", EN)?.body).toMatch(/^Spent 3,200\u00A0₴ · 540% more/u);
    expect(summaryMessage(DEFAULT_STATE, "2026-11-01", "monthly", EN)).toBeNull();
  });
});
