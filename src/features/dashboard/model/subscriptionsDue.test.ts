import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Subscription } from "@/features/data/model/types";

import { monthlyPrice, nextCharge, subscriptionsDue } from "./subscriptionsDue";

// A monthly subscription with the given fields
const subscription = (id: string, over: Partial<Subscription>): Subscription => ({
  id,
  name: id,
  icon: "📺",
  price: 300,
  currency: "UAH",
  period: "monthly",
  dayOfMonth: 15,
  startMonth: "2026-01",
  active: true,
  ...over,
});

describe("nextCharge", () => {
  it("is this month's day, next month's, or none when the subscription ends", () => {
    expect(nextCharge(subscription("a", {}), "2026-10-10")).toBe("2026-10-15");
    expect(nextCharge(subscription("a", { dayOfMonth: 5 }), "2026-10-10")).toBe("2026-11-05");
    expect(nextCharge(subscription("a", { dayOfMonth: 5, endMonth: "2026-10" }), "2026-10-10")).toBeNull();
  });

  it("follows a weekly or quarterly plan", () => {
    const weekly = subscription("a", { period: "weekly", dayOfMonth: 1, startMonth: "2026-10" });
    expect(nextCharge(weekly, "2026-10-10")).toBe("2026-10-15");
    const quarterly = subscription("a", { period: "quarterly", dayOfMonth: 5, startMonth: "2026-08" });
    expect(nextCharge(quarterly, "2026-10-10")).toBe("2026-11-05");
    expect(monthlyPrice({ ...weekly, price: 120 })).toBe(520);
  });
});

describe("subscriptionsDue", () => {
  it("totals this month's subscriptions and orders the dearest first", () => {
    const state: AppState = {
      ...DEFAULT_STATE,
      subscriptions: [
        subscription("cheap", { price: 100 }),
        subscription("yearly", { price: 2400, period: "yearly" }),
        subscription("paused", { active: false }),
      ],
    };
    const due = subscriptionsDue(state, "2026-10", [{ month: "2026-09", income: 0, expense: 1500, net: -1500 }], 1);
    expect(due.billed.map((sub) => sub.id)).toEqual(["cheap", "yearly"]);
    expect(due.total).toBe(300);
    expect(due.top.map((sub) => sub.id)).toEqual(["yearly"]);
    expect(due.share).toBe(20);
    expect(monthlyPrice(subscription("y", { price: 1200, period: "yearly" }))).toBe(100);
  });
});
