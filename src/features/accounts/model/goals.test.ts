import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";

import { deleteGoal, goalProblem, goalsSummary, initialGoalForm, saveGoal } from "./goals";

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [
    {
      id: "trip",
      name: "Trip",
      icon: "✈️",
      kind: "savings",
      currency: "UAH",
      openingBalance: 4000,
      goal: { target: 10000, deadline: "2027-01-15" },
    },
    {
      id: "done",
      name: "Done",
      icon: "🎯",
      kind: "savings",
      currency: "UAH",
      openingBalance: 600,
      goal: { target: 500 },
    },
    { id: "plain", name: "Plain", icon: "💳", kind: "card", currency: "UAH", openingBalance: 100 },
  ],
};

describe("goalsSummary", () => {
  it("measures each goal and what is left a month to reach it on time", () => {
    const summary = goalsSummary(state, "2026-10-10");
    expect(summary.goals.map((goal) => goal.account?.id)).toEqual(["trip", "done"]);
    expect(summary.reached).toBe(1);
    expect(summary.goals[0]?.progress).toBe(0.4);
    expect(summary.perMonth).toBe(2000);
    expect(summary.haveTotal).toBe(4500);
    expect(summary.targetTotal).toBe(10500);
  });
});

describe("goals of their own", () => {
  it("counts the money put aside and the accounts that count towards it", () => {
    const form = {
      ...initialGoalForm("new", "UAH"),
      name: "Trip",
      target: "40000",
      saved: "5000",
      accountIds: ["trip"],
    };
    expect(goalProblem(form)).toBeNull();
    const saved = saveGoal(state, { ...form, deadline: "2027-03-01" }, () => "g1");
    expect(saved.goals).toEqual([
      {
        id: "g1",
        name: "Trip",
        icon: "🎯",
        target: 40000,
        currency: "UAH",
        saved: 5000,
        deadline: "2027-03-01",
        accountIds: ["trip"],
      },
    ]);
    const own = goalsSummary(saved, "2026-10-15").goals.find((goal) => goal.goal?.id === "g1");
    expect(own?.have).toBeGreaterThan(5000);
    expect(own?.perMonthBase).toBeGreaterThan(0);
    expect(deleteGoal(saved, "g1").goals).toEqual([]);
  });

  it("asks for a name and a target", () => {
    expect(goalProblem(initialGoalForm("new", "UAH"))).toBe("goals.problem.name");
    expect(goalProblem({ ...initialGoalForm("new", "UAH"), name: "Car" })).toBe("goals.problem.target");
    expect(goalProblem({ ...initialGoalForm("new", "UAH"), name: "Car", target: "10", saved: "-1" })).toBe(
      "goals.problem.saved",
    );
  });
});
