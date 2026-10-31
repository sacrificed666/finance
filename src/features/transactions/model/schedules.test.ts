import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, RecurringRule, Subscription } from "@/features/data/model/types";

import { deleteSchedule, isUntouchedPlan, materializeRecurring, rememberSkipped } from "./schedules";
import { resumeSubscription, saveSubscription } from "./subscriptions";

// A yearly cloud plan that renews every March
const cloud: Subscription = {
  id: "cloud",
  name: "Cloud",
  icon: "☁️",
  price: 1200,
  currency: "UAH",
  period: "yearly",
  dayOfMonth: 10,
  startMonth: "2026-03",
  active: true,
};

// A monthly rent rule since the summer
const rent: RecurringRule = {
  id: "rent",
  type: "expense",
  amount: 10000,
  currency: "UAH",
  categoryId: "cat-housing",
  dayOfMonth: 1,
  startMonth: "2026-07",
};

// The cloud plan's entries as date and amount
const charges = (state: AppState) =>
  state.transactions.filter((tx) => tx.subscriptionId === "cloud").map((tx) => `${tx.date}:${String(tx.amount)}`);

describe("schedules", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-15T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("books a quarterly rule every third month", () => {
    const state = materializeRecurring({ ...DEFAULT_STATE, recurring: [{ ...rent, period: "quarterly" }] });
    expect(state.transactions.map((tx) => tx.date)).toEqual([
      "2026-07-01",
      "2026-10-01",
      "2027-01-01",
      "2027-04-01",
      "2027-07-01",
    ]);
  });

  it("books a weekly rule every seven days and keeps a deleted week out", () => {
    const weekly: RecurringRule = {
      ...rent,
      id: "lunch",
      amount: 500,
      period: "weekly",
      dayOfMonth: 5,
      startMonth: "2026-10",
    };
    const state = materializeRecurring({ ...DEFAULT_STATE, recurring: [weekly] });
    const dates = state.transactions.map((tx) => tx.date);
    expect(dates.slice(0, 4)).toEqual(["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"]);
    expect(dates).toHaveLength(52);
    expect(dates.at(-1)).toBe("2027-09-27");
    expect(state.transactions[2]?.id).toBe("rec:lunch:2026-10-19");
    expect(isUntouchedPlan(state, state.transactions[2]!, "2026-10-15")).toBe(true);
    const removed = rememberSkipped(state, {
      ...state,
      transactions: state.transactions.filter((tx) => tx.date !== "2026-10-26"),
    });
    expect(removed.recurring[0]?.skipped).toEqual(["2026-10-26"]);
    expect(materializeRecurring(removed).transactions.map((tx) => tx.date)).not.toContain("2026-10-26");
  });

  it("books a yearly plan once a year at its full price", () => {
    const state = materializeRecurring({ ...DEFAULT_STATE, subscriptions: [cloud] });
    expect(charges(state)).toEqual(["2026-03-10:1200", "2027-03-10:1200"]);
    expect(materializeRecurring(state)).toBe(state);
  });

  it("books again a planned month that was never stored, and never a skipped one", () => {
    const state = materializeRecurring({ ...DEFAULT_STATE, recurring: [rent] });
    const stored = { ...state, transactions: state.transactions.filter((tx) => tx.date <= "2026-10-15") };
    expect(materializeRecurring(stored).transactions).toHaveLength(state.transactions.length);
    const skipped = { ...stored, recurring: [{ ...rent, skipped: ["2026-12"] }] };
    expect(materializeRecurring(skipped).transactions.map((tx) => tx.id)).not.toContain("rec:rent:2026-12");
  });

  it("keeps a removed month out, but not one outside the span or of a schedule that is gone", () => {
    const state = materializeRecurring({ ...DEFAULT_STATE, recurring: [rent] });
    // The state with these entries removed
    const without = (ids: string[]) => ({
      ...state,
      transactions: state.transactions.filter((tx) => !ids.includes(tx.id)),
    });
    expect(rememberSkipped(state, without(["rec:rent:2026-12"])).recurring[0]?.skipped).toEqual(["2026-12"]);
    expect(rememberSkipped(state, state)).toBe(state);
    const ended = { ...without(["rec:rent:2027-02"]), recurring: [{ ...rent, endMonth: "2027-01" }] };
    expect(rememberSkipped(state, ended).recurring[0]?.skipped).toBeUndefined();
    const gone = deleteSchedule(state, "recurring", "rent");
    expect(rememberSkipped(state, gone)).toBe(gone);
  });

  it("tells a planned month the schedule alone keeps from one that needs storing", () => {
    const state = materializeRecurring({ ...DEFAULT_STATE, recurring: [rent] });
    const today = "2026-10-15";
    // A booked entry by its id
    const byId = (id: string) => state.transactions.find((tx) => tx.id === id)!;
    expect(isUntouchedPlan(state, byId("rec:rent:2026-12"), today)).toBe(true);
    expect(isUntouchedPlan(state, byId("rec:rent:2026-10"), today)).toBe(false);
    expect(isUntouchedPlan(state, { ...byId("rec:rent:2026-12"), tags: ["flat"] }, today)).toBe(false);
    expect(isUntouchedPlan(state, { ...byId("rec:rent:2026-12"), amount: 1 }, today)).toBe(false);
    expect(isUntouchedPlan(state, { ...byId("rec:rent:2026-12"), externalId: "mono:1" }, today)).toBe(false);
    const skipped = { ...state, recurring: [{ ...rent, skipped: ["2026-12"] }] };
    expect(isUntouchedPlan(skipped, byId("rec:rent:2026-12"), today)).toBe(false);
  });

  it("deletes one schedule without touching the planned months of another", () => {
    const state = materializeRecurring({ ...DEFAULT_STATE, recurring: [rent], subscriptions: [cloud] });
    const edited = {
      ...state,
      transactions: state.transactions.map((tx) =>
        tx.id === "rec:rent:2026-12" ? Object.assign({}, tx, { amount: 9000 }) : tx,
      ),
    };
    const out = deleteSchedule(edited, "subscription", "cloud");
    expect(charges(out)).toEqual([]);
    expect(out.transactions.find((tx) => tx.id === "rec:rent:2026-12")?.amount).toBe(9000);
  });

  it("moves a plan from monthly to yearly for the months still to come", () => {
    const monthly = saveSubscription(DEFAULT_STATE, { ...cloud, period: "monthly", price: 100 });
    const yearly = saveSubscription(monthly, { ...monthly.subscriptions[0]!, period: "yearly", price: 1200 });
    const left = charges(yearly);
    expect(left.slice(0, 8)).toEqual(charges(monthly).slice(0, 8));
    expect(left.filter((charge) => charge > "2026-10-15")).toEqual(["2027-03-10:1200"]);
  });

  it("keeps a paused plan's recorded months and books again only from today on", () => {
    const running = saveSubscription(DEFAULT_STATE, { ...cloud, period: "monthly", price: 100 });
    const paused = saveSubscription(
      { ...running, subscriptions: [{ ...running.subscriptions[0]!, active: false }] },
      { ...running.subscriptions[0]!, active: false },
    );
    expect(charges(paused).every((charge) => charge < "2026-10-15")).toBe(true);
    const thinned = { ...paused, transactions: paused.transactions.filter((tx) => tx.id !== "sub:cloud:2026-05") };
    const resumed = resumeSubscription(thinned, "cloud");
    expect(resumed.subscriptions[0]?.active).toBe(true);
    expect(resumed.transactions.some((tx) => tx.id === "sub:cloud:2026-05")).toBe(false);
    expect(charges(resumed).filter((charge) => charge > "2026-10-15")).toHaveLength(11);
    expect(resumeSubscription(thinned, "missing")).toBe(thinned);
  });
});
