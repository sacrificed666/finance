import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { en } from "@/shared/i18n/messages/en";
import { makeI18n } from "@/shared/i18n/translate";

import { feedEvents } from "./feedEvents";

const EN = makeI18n("en", en);

describe("feedEvents", () => {
  it("lists planned money, money due back and grace periods by date, not what the bank already booked", () => {
    const state: AppState = {
      ...DEFAULT_STATE,
      savings: [
        {
          id: "mono",
          name: "Mono",
          icon: "💳",
          kind: "card",
          currency: "UAH",
          openingBalance: -4000,
          credit: { limit: 9000 },
        },
      ],
      transactions: [
        {
          id: "rent",
          type: "expense",
          amount: 15000,
          currency: "UAH",
          categoryId: "cat-rent",
          date: "2026-11-01",
          note: "Rent",
        },
        {
          id: "pay",
          type: "income",
          amount: 62000,
          currency: "UAH",
          categoryId: "cat-salary",
          date: "2026-11-05",
          note: "Salary",
        },
        {
          id: "bank",
          type: "expense",
          amount: 50,
          currency: "UAH",
          categoryId: "cat-coffee",
          date: "2026-11-02",
          externalId: "mono:1",
        },
        { id: "old", type: "expense", amount: 70, currency: "UAH", categoryId: "cat-coffee", date: "2026-10-01" },
      ],
      receivables: [
        {
          id: "oleh",
          name: "Oleh",
          icon: "🤝",
          amount: 1000,
          currency: "UAH",
          date: "2026-10-01",
          dueDate: "2026-11-10",
          repaid: 400,
        },
      ],
    };
    const events = feedEvents(state, "2026-10-20", EN);
    expect(events.map((event) => [event.date, event.title.replaceAll(" ", " ")])).toEqual([
      ["2026-10-31", "Pay back Mono, grace period 4,000 ₴"],
      ["2026-11-01", "Rent −15,000 ₴"],
      ["2026-11-05", "Salary +62,000 ₴"],
      ["2026-11-10", "Oleh to pay you back 600 ₴"],
    ]);
    expect(events[1]?.uid).toBe("entry-rent@finance");
  });
});
