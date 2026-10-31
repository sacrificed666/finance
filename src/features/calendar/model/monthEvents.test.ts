import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { profileFromRegime } from "@/features/income/model/tax";

import {
  daySummaries,
  earnedOn,
  entryEvents,
  keyDates,
  monthFigures,
  monthWeeks,
  runningNet,
  type EventNames,
} from "./monthEvents";

const names: EventNames = {
  category: (entry) => entry?.name ?? "?",
  obligation: (obligation) => `${obligation.kind} ${obligation.period}`,
  paid: "paid",
  matures: "matures",
  receivables: "loans",
  grace: "grace",
  wishes: "wishes",
};

const state: AppState = {
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_STATE.settings, tax: profileFromRegime("fop3") },
  savings: [
    { id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 0 },
    { id: "jar", name: "Jar", icon: "🫙", kind: "savings", currency: "UAH", openingBalance: 0 },
  ],
  transactions: [
    {
      id: "milk",
      type: "expense",
      amount: 100,
      currency: "UAH",
      categoryId: "cat-groceries",
      date: "2026-10-03",
      note: " ",
    },
    {
      id: "pay",
      type: "income",
      amount: 1000,
      currency: "UAH",
      categoryId: "cat-salary",
      date: "2026-10-05",
      note: "October",
    },
    {
      id: "move",
      type: "transfer",
      amount: 50,
      currency: "UAH",
      categoryId: "",
      date: "2026-10-05",
      accountId: "card",
      toAccountId: "jar",
    },
    { id: "rent", type: "expense", amount: 400, currency: "UAH", categoryId: "cat-rent", date: "2026-10-20" },
    { id: "old", type: "expense", amount: 1, currency: "UAH", categoryId: "cat-rent", date: "2026-09-20" },
  ],
  receivables: [
    {
      id: "loan",
      name: "Friend",
      icon: "🤝",
      amount: 300,
      repaid: 100,
      currency: "UAH",
      dueDate: "2026-10-15",
      date: "2026-01-01",
    },
  ],
  wishlist: [
    {
      id: "tv",
      name: "TV",
      icon: "📺",
      price: 900,
      currency: "UAH",
      priority: "high",
      month: "2026-10",
      createdAt: "2026-01-01",
    },
  ],
};

describe("entryEvents", () => {
  it("names entries by note or category and transfers by their accounts", () => {
    const events = entryEvents(state, "2026-10", names);
    expect(events.map((event) => [event.id, event.title, event.subtitle])).toEqual([
      ["milk", "Groceries", undefined],
      ["pay", "October", "Salary"],
      ["move", "Card → Jar", undefined],
      ["rent", "Rent", undefined],
    ]);
  });
});

describe("keyDates", () => {
  it("lists purchases, loans due back and tax deadlines in date order", () => {
    expect(keyDates(state, "2026-10", names).map((event) => [event.date, event.kind, event.amount])).toEqual([
      ["2026-10-01", "wish", 900],
      ["2026-10-15", "receivable", 200],
      ["2026-10-20", "tax", expect.any(Number)],
    ]);
  });

  it("adds a credit card's grace period to the running month only", () => {
    const credit: AppState = {
      ...state,
      savings: [
        {
          id: "cc",
          name: "Credit",
          icon: "💳",
          kind: "card",
          currency: "UAH",
          openingBalance: -700,
          credit: { limit: 5000 },
        },
      ],
    };
    const october = keyDates(credit, "2026-10", names, "2026-10-12").filter((event) => event.kind === "grace");
    expect(october).toEqual([
      expect.objectContaining({ date: "2026-10-31", title: "Credit", amount: 700, subtitle: "grace" }),
    ]);
    expect(keyDates(credit, "2026-11", names, "2026-10-12").some((event) => event.kind === "grace")).toBe(false);
  });
});

describe("daySummaries and monthFigures", () => {
  it("sums each day and the month after today", () => {
    const days = daySummaries(state, "2026-10", entryEvents(state, "2026-10", names));
    expect(days).toHaveLength(31);
    expect(days[4]).toMatchObject({ date: "2026-10-05", net: 1000, spent: 0 });
    expect(earnedOn(days[4] ?? { date: "", events: [], net: 0, spent: 0 })).toBe(1000);
    const figures = monthFigures(days, "2026-10-10");
    expect(figures).toMatchObject({
      net: 500,
      entries: 4,
      spent: 500,
      earned: 1000,
      aheadOut: 400,
      daysOut: 1,
      aheadIn: 0,
      daysGone: 10,
      daysWithoutSpend: 9,
    });
    expect(figures.busiest?.date).toBe("2026-10-20");
  });

  it("builds the net up day by day from zero", () => {
    const days = daySummaries(state, "2026-10", entryEvents(state, "2026-10", names));
    const totals = runningNet(days);
    expect(totals).toHaveLength(32);
    expect(totals[0]).toBe(0);
    expect(totals[3]).toBe(-100);
    expect(totals[5]).toBe(900);
    expect(totals.at(-1)).toBe(500);
  });

  it("splits the month into weeks from Monday, cut at its edges", () => {
    const weeks = monthWeeks(daySummaries(state, "2026-10", entryEvents(state, "2026-10", names)));
    expect(weeks.map((week) => [week.from, week.to])).toEqual([
      ["2026-10-01", "2026-10-04"],
      ["2026-10-05", "2026-10-11"],
      ["2026-10-12", "2026-10-18"],
      ["2026-10-19", "2026-10-25"],
      ["2026-10-26", "2026-10-31"],
    ]);
    expect(weeks[0]).toMatchObject({ spent: 100, earned: 0, entries: 1 });
    expect(weeks[1]).toMatchObject({ spent: 0, earned: 1000, entries: 2 });
    expect(weeks[3]).toMatchObject({ spent: 400, entries: 1 });
  });
});
