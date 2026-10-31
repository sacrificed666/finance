import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, RecurringRule, Transaction } from "@/features/data/model/types";

import {
  canRepeat,
  monthlyFlow,
  nextPosting,
  recurringProblem,
  recurringStatus,
  ruleFromEntry,
  saveRecurring,
  startRuleFrom,
  statusCounts,
} from "./recurring";
import { materializeRecurring, rememberSkipped } from "./schedules";

// A monthly rent from spring to the end of the year
const rent: RecurringRule = {
  id: "rent",
  type: "expense",
  amount: 12000,
  currency: "UAH",
  categoryId: "cat-housing",
  dayOfMonth: 5,
  startMonth: "2026-04",
  endMonth: "2026-12",
};

describe("recurringStatus", () => {
  it("tells whether a rule runs, waits or has ended in a month", () => {
    expect(recurringStatus(rent, "2026-03")).toBe("upcoming");
    expect(recurringStatus(rent, "2026-04")).toBe("now");
    expect(recurringStatus(rent, "2026-12")).toBe("now");
    expect(recurringStatus(rent, "2027-01")).toBe("ended");
    expect(recurringStatus({ ...rent, endMonth: undefined }, "2030-01")).toBe("now");
  });
});

// The salary on the 10th, every month since spring
const salary: RecurringRule = {
  ...rent,
  id: "salary",
  type: "income",
  amount: 40000,
  dayOfMonth: 10,
  endMonth: undefined,
};

describe("statusCounts", () => {
  it("counts the rules of each status", () => {
    expect(statusCounts([rent, salary], "2027-02")).toEqual({ now: 1, upcoming: 0, ended: 1 });
  });
});

describe("monthlyFlow", () => {
  it("adds up what comes in and goes out", () => {
    expect(monthlyFlow(DEFAULT_STATE, [rent, salary])).toEqual({ in: 40000, out: 12000 });
  });
});

describe("nextPosting", () => {
  it("finds the nearest day still ahead, this month or the next", () => {
    expect(nextPosting([rent, salary], "2026-10-07")).toBe("2026-10-10");
    expect(nextPosting([rent, salary], "2026-10-10")).toBe("2026-11-05");
    expect(nextPosting([], "2026-10-10")).toBeUndefined();
  });
});

describe("recurringProblem", () => {
  const draft = { amount: 100, dayOfMonth: 5, categoryId: "cat-rent", startMonth: "2026-04", endMonth: "" };

  it("names the first thing to fix", () => {
    expect(recurringProblem(draft)).toBeNull();
    expect(recurringProblem({ ...draft, amount: 0, dayOfMonth: 40 })).toBe("problem.amount");
    expect(recurringProblem({ ...draft, dayOfMonth: 2.5 })).toBe("problem.day");
    expect(recurringProblem({ ...draft, categoryId: "" })).toBe("problem.category");
    expect(recurringProblem({ ...draft, endMonth: "2026-03" })).toBe("problem.endBeforeStart");
  });
});

// The rule's entries as month and amount
const postings = (state: AppState) =>
  state.transactions.filter((tx) => tx.recurringId === "rent").map((tx) => `${tx.date}:${String(tx.amount)}`);

describe("saveRecurring", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-09-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds a rule with its months, then changes only the ones still to come", () => {
    const added = saveRecurring({ ...DEFAULT_STATE, recurring: [] }, { ...rent, endMonth: "2026-10" });
    expect(postings(added)).toEqual([
      "2026-04-05:12000",
      "2026-05-05:12000",
      "2026-06-05:12000",
      "2026-07-05:12000",
      "2026-08-05:12000",
      "2026-09-05:12000",
      "2026-10-05:12000",
    ]);
    const changed = saveRecurring(added, { ...added.recurring[0]!, amount: 13000 });
    expect(changed.recurring).toHaveLength(1);
    expect(postings(changed).slice(-2)).toEqual(["2026-09-05:12000", "2026-10-05:13000"]);
  });

  it("never brings back a month that was deleted", () => {
    const added = saveRecurring({ ...DEFAULT_STATE, recurring: [] }, rent);
    const pruned = rememberSkipped(added, {
      ...added,
      transactions: added.transactions.filter((tx) => tx.id !== "rec:rent:2026-06" && tx.id !== "rec:rent:2026-11"),
    });
    expect(pruned.recurring[0]?.skipped).toEqual(["2026-06", "2026-11"]);
    const changed = saveRecurring(pruned, { ...pruned.recurring[0]!, amount: 13000 });
    const months = changed.transactions.map((tx) => tx.id);
    expect(months).not.toContain("rec:rent:2026-06");
    expect(months).not.toContain("rec:rent:2026-11");
    expect(materializeRecurring(changed).transactions.map((tx) => tx.id)).not.toContain("rec:rent:2026-11");
  });

  it("keeps tags and photos of a planned month it rewrites", () => {
    const added = saveRecurring({ ...DEFAULT_STATE, recurring: [] }, rent);
    const tagged = {
      ...added,
      transactions: added.transactions.map((tx) =>
        tx.id === "rec:rent:2026-10" ? Object.assign({}, tx, { tags: ["flat"], attachmentIds: ["photo"] }) : tx,
      ),
    };
    const changed = saveRecurring(tagged, { ...tagged.recurring[0]!, amount: 13000 });
    expect(changed.transactions.find((tx) => tx.id === "rec:rent:2026-10")).toMatchObject({
      amount: 13000,
      tags: ["flat"],
      attachmentIds: ["photo"],
    });
  });

  it("books past months only when the start moves earlier", () => {
    const added = saveRecurring({ ...DEFAULT_STATE, recurring: [] }, { ...rent, startMonth: "2026-08" });
    const earlier = saveRecurring(added, { ...added.recurring[0]!, startMonth: "2026-06" });
    expect(postings(earlier).slice(0, 2)).toEqual(["2026-08-05:12000", "2026-09-05:12000"]);
    expect(earlier.transactions.some((tx) => tx.id === "rec:rent:2026-06")).toBe(true);
    const later = saveRecurring(earlier, { ...earlier.recurring[0]!, startMonth: "2026-08" });
    expect(later.transactions.some((tx) => tx.id === "rec:rent:2026-06")).toBe(false);
  });
});

describe("startRuleFrom", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-20T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const RENT: Transaction = {
    id: "rent",
    type: "expense",
    amount: 9000,
    currency: "UAH",
    categoryId: "cat-housing",
    date: "2026-08-05",
    note: "Rent",
    accountId: "card",
  };

  it("makes the entry the first month of a monthly rule and books the months ahead", () => {
    const next = startRuleFrom({ ...DEFAULT_STATE, transactions: [RENT] }, "rent", ruleFromEntry(RENT, "r1"));
    const rule = next.recurring.find((item) => item.id === "r1");
    expect(rule).toMatchObject({ amount: 9000, dayOfMonth: 5, startMonth: "2026-08", skipped: ["2026-09", "2026-10"] });
    expect(next.transactions.find((tx) => tx.id === "rent")?.recurringId).toBe("r1");
    const booked = next.transactions.filter((tx) => tx.recurringId === "r1").map((tx) => tx.date);
    expect(booked).toContain("2026-11-05");
    expect(booked).not.toContain("2026-09-05");
  });

  it("leaves transfers, split parts and planned entries alone", () => {
    expect(canRepeat({ ...RENT, type: "transfer" })).toBe(false);
    expect(canRepeat({ ...RENT, splitId: "s" })).toBe(false);
    expect(canRepeat({ ...RENT, recurringId: "x" })).toBe(false);
    const state = { ...DEFAULT_STATE, transactions: [{ ...RENT, splitId: "s" }] };
    expect(startRuleFrom(state, "rent", ruleFromEntry(RENT, "r1"))).toBe(state);
  });

  it("keeps the entry apart when the rule books other days", () => {
    const weekly = { ...ruleFromEntry(RENT, "w"), period: "weekly" as const, dayOfMonth: 6 };
    const next = startRuleFrom({ ...DEFAULT_STATE, transactions: [RENT] }, "rent", weekly);
    expect(next.transactions.find((tx) => tx.id === "rent")?.recurringId).toBeUndefined();
    expect(next.transactions.some((tx) => tx.recurringId === "w" && tx.date > "2026-10-20")).toBe(true);
  });
});
