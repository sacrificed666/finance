import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";

import { startSteps } from "./start";

describe("startSteps", () => {
  it("ticks off each first step once its data is there", () => {
    expect(startSteps(DEFAULT_STATE).map((step) => step.done)).toEqual([false, false, false]);
    const done = startSteps({
      ...DEFAULT_STATE,
      transactions: [{ id: "t", type: "expense", amount: 1, currency: "UAH", categoryId: "c", date: "2026-10-01" }],
    });
    expect(done.map((step) => [step.id, step.done])).toEqual([
      ["accounts", false],
      ["income", false],
      ["expense", true],
    ]);
  });
});
