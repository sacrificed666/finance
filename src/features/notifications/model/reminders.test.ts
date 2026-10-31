import { describe, expect, it } from "vitest";

import { categoryName } from "@/features/data/model/categoryName";
import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";
import { taxObligations } from "@/features/income/model/taxCalendar";
import { dueReminders, reminderMessage } from "@/features/notifications/model/reminders";
import { en } from "@/shared/i18n/messages/en";
import { uk } from "@/shared/i18n/messages/uk";
import { makeI18n } from "@/shared/i18n/translate";
import { addDays } from "@/shared/lib/date";

const EN = makeI18n("en", en);
const UK = makeI18n("uk", uk);
const TODAY = "2026-09-29";

// An expense today with any fields changed
const tx = (over: Partial<Transaction>): Transaction => ({
  id: "t",
  type: "expense",
  amount: 399,
  currency: "UAH",
  categoryId: "cat-food",
  date: TODAY,
  ...over,
});

const base: AppState = {
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_STATE.settings, tax: { ...DEFAULT_STATE.settings.tax, regime: "none" } },
};

describe("dueReminders", () => {
  it("lists planned postings for today and tomorrow, not typed or imported entries", () => {
    const state: AppState = {
      ...base,
      subscriptions: [
        {
          id: "nf",
          name: "Netflix",
          icon: "📺",
          price: 399,
          currency: "UAH",
          period: "monthly",
          dayOfMonth: 30,
          startMonth: "2026-01",
          active: true,
        },
      ],
      transactions: [
        tx({ id: "a", subscriptionId: "nf", date: addDays(TODAY, 1) }),
        tx({ id: "b", recurringId: "salary", type: "income", amount: 50_000, note: "Salary", date: TODAY }),
        tx({ id: "c", date: TODAY, note: "Coffee" }),
        tx({ id: "d", recurringId: "rent", date: TODAY, externalId: "mono:1" }),
        tx({ id: "e", recurringId: "rent", date: addDays(TODAY, 2) }),
        tx({ id: "f", recurringId: "move", type: "transfer", date: TODAY }),
      ],
    };
    const got = dueReminders(state, TODAY, EN);
    expect(got.map((r) => [r.kind, r.date, r.subject])).toEqual([
      ["income", TODAY, "Salary"],
      ["payment", addDays(TODAY, 1), "Netflix"],
    ]);
  });

  it("names a posting by its category when it has no note", () => {
    const state: AppState = { ...base, transactions: [tx({ recurringId: "r", categoryId: "cat-food" })] };
    const [only] = dueReminders(state, TODAY, EN);
    expect(only?.subject).toBe(
      categoryName(
        EN,
        state.categories.find((c) => c.id === "cat-food"),
      ),
    );
  });

  it("brings up a tax three days before it is due and on the day, until it is marked paid", () => {
    const state: AppState = { ...base, settings: { ...base.settings, tax: { ...base.settings.tax, regime: "fop3" } } };
    const esv = taxObligations(state, 2026).find((o) => o.kind === "esv" && o.due > "2026-03-01")!;
    const early = dueReminders(state, addDays(esv.due, -3), EN).filter((r) => r.kind === "tax");
    expect(early.map((r) => r.date)).toContain(esv.due);
    expect(dueReminders(state, addDays(esv.due, -2), EN).filter((r) => r.kind === "tax" && r.date === esv.due)).toEqual(
      [],
    );
    expect(dueReminders(state, esv.due, EN).some((r) => r.kind === "tax" && r.date === esv.due)).toBe(true);
    const paid = { ...state, settings: { ...state.settings, taxPaid: { [esv.id]: esv.due } } };
    expect(dueReminders(paid, esv.due, EN).some((r) => r.kind === "tax" && r.date === esv.due)).toBe(false);
  });

  it("reminds of money due back today, only while some of it is outstanding", () => {
    const loan = {
      id: "l",
      name: "Oleh",
      icon: "🤝",
      amount: 3000,
      currency: "UAH" as const,
      date: "2026-08-01",
      dueDate: TODAY,
      repaid: 1000,
    };
    const got = dueReminders({ ...base, receivables: [loan] }, TODAY, EN);
    expect(got).toEqual([
      { kind: "receivable", date: TODAY, subject: "Oleh to pay you back", amount: 2000, currency: "UAH" },
    ]);
    expect(dueReminders({ ...base, receivables: [{ ...loan, repaid: 3000 }] }, TODAY, EN)).toEqual([]);
    expect(dueReminders({ ...base, receivables: [{ ...loan, dueDate: addDays(TODAY, -1) }] }, TODAY, EN)).toEqual([]);
  });
});

describe("reminderMessage", () => {
  it("stays silent when nothing is due", () => {
    expect(reminderMessage([], TODAY, EN)).toBeNull();
  });

  it("writes one line per item in the user's language, and folds the rest", () => {
    const items = Array.from({ length: 7 }, (_, i) => ({
      kind: "payment" as const,
      date: i === 0 ? TODAY : addDays(TODAY, 1),
      subject: `Item ${i}`,
      amount: 1500,
      currency: "UAH" as const,
    }));
    const message = reminderMessage(items, TODAY, UK)!;
    const lines = message.body.split("\n");
    expect(message.title).toBe("Що на черзі");
    expect(lines).toHaveLength(6);
    expect(lines[0]).toMatch(/^Сьогодні · Item 0 · 1\s500\u00A0₴$/);
    expect(lines[1]).toMatch(/^Завтра · Item 1/);
    expect(lines[5]).toBe("…і ще 2");
    expect(message.url).toBe("/calendar");
    expect(message.tag).toBe(`digest-${TODAY}`);
  });

  it("marks money coming in and says how far away a tax is", () => {
    const message = reminderMessage(
      [
        {
          kind: "tax",
          date: addDays(TODAY, 3),
          subject: "Social contribution (ЄСВ) for Q3 2026",
          amount: 5700,
          currency: "UAH",
        },
        { kind: "income", date: TODAY, subject: "Salary", amount: 50_000, currency: "UAH" },
      ],
      TODAY,
      EN,
    )!;
    expect(message.body.split("\n")).toEqual([
      "In 3 days · Social contribution (ЄСВ) for Q3 2026 · 5,700\u00A0₴",
      "Today · Salary · +50,000\u00A0₴",
    ]);
    expect(message.url).toBe("/income");
  });
});

describe("the grace period reminder", () => {
  it("reminds three days before the month ends and on its last day", () => {
    const state: AppState = {
      ...base,
      savings: [
        {
          id: "mono",
          name: "Mono",
          icon: "💳",
          kind: "card",
          currency: "UAH",
          openingBalance: -4000,
          credit: { limit: 50000 },
        },
      ],
    };
    expect(dueReminders(state, "2026-09-27", EN)).toEqual([
      { kind: "grace", date: "2026-09-30", subject: "Pay back Mono, grace period", amount: 4000, currency: "UAH" },
    ]);
    expect(dueReminders(state, "2026-09-28", EN)).toEqual([]);
    expect(dueReminders(state, "2026-09-30", EN)).toHaveLength(1);
  });
});
