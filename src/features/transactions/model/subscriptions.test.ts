import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Subscription } from "@/features/data/model/types";

import { resumeSubscription, saveSubscription, subscriptionCounts, subscriptionProblem } from "./subscriptions";

// A monthly subscription since spring
const music: Subscription = {
  id: "music",
  name: "Music",
  icon: "🎵",
  price: 99,
  currency: "UAH",
  period: "monthly",
  dayOfMonth: 3,
  startMonth: "2026-08",
  active: true,
};

describe("subscriptionCounts", () => {
  it("counts the subscriptions of each status", () => {
    const subscriptions = [
      music,
      { ...music, id: "paused", active: false },
      { ...music, id: "later", startMonth: "2027-01" },
      { ...music, id: "over", endMonth: "2026-09" },
    ];
    expect(subscriptionCounts(subscriptions, "2026-10")).toEqual({ active: 1, upcoming: 1, ended: 1, paused: 1 });
  });
});

describe("subscriptionProblem", () => {
  const draft = { name: "Music", price: 99, dayOfMonth: 3, startMonth: "2026-08", endMonth: "" };

  it("names the first thing to fix", () => {
    expect(subscriptionProblem(draft)).toBeNull();
    expect(subscriptionProblem({ ...draft, name: " ", price: 0 })).toBe("tx.subs.problem.name");
    expect(subscriptionProblem({ ...draft, price: Number.NaN })).toBe("tx.subs.problem.price");
    expect(subscriptionProblem({ ...draft, dayOfMonth: 0 })).toBe("problem.day");
    expect(subscriptionProblem({ ...draft, endMonth: "2026-01" })).toBe("problem.endBeforeStart");
  });
});

describe("saving", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-15T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds a subscription with its charges and keeps a paused one paused when edited", () => {
    const added = saveSubscription(DEFAULT_STATE, music);
    const charges = added.transactions.filter((tx) => tx.subscriptionId === "music").map((tx) => tx.date);
    expect(charges.slice(0, 3)).toEqual(["2026-08-03", "2026-09-03", "2026-10-03"]);
    const paused: AppState = { ...added, subscriptions: [{ ...music, active: false }] };
    expect(saveSubscription(paused, { ...music, price: 120 }).subscriptions[0]).toMatchObject({
      price: 120,
      active: false,
    });
  });

  it("resumes a paused subscription", () => {
    const paused: AppState = { ...DEFAULT_STATE, subscriptions: [{ ...music, active: false }] };
    expect(resumeSubscription(paused, "music").subscriptions[0]?.active).toBe(true);
  });
});
