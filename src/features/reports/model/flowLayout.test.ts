import { describe, expect, it } from "vitest";

import { FLOW_KEPT } from "./flow";
import { flowLayout } from "./flowLayout";

const FLOW = {
  sources: [
    { id: "pay", value: 3000 },
    { id: "gig", value: 1000 },
  ],
  uses: [
    { id: "rent", value: 2000 },
    { id: "food", value: 10 },
    { id: "taxi", value: 10 },
    { id: FLOW_KEPT, value: 1980 },
  ],
  total: 4000,
};

describe("flowLayout", () => {
  it("stacks each column to the same scale and joins them with bands", () => {
    const layout = flowLayout(FLOW, 600, 240);
    expect(layout.columns).toEqual({ left: 132, middle: 295, right: 458, node: 10, label: 132 });
    expect(layout.bands).toHaveLength(6);
    expect(layout.bands[0]?.path).toMatch(/^M142 /u);
    expect(layout.middle.height).toBeCloseTo(216);
    const [rent, food] = layout.uses;
    expect(rent?.height).toBeCloseTo(108);
    expect(food?.height).toBe(2);
  });

  it("pushes the labels of small neighbours apart and keeps them inside", () => {
    const { uses } = flowLayout(FLOW, 600, 240);
    const labels = uses.map((box) => box.label);
    for (let index = 1; index < labels.length; index += 1) {
      expect((labels[index] ?? 0) - (labels[index - 1] ?? 0)).toBeGreaterThanOrEqual(38);
    }
    expect(labels.at(-1)).toBeLessThanOrEqual(221);
  });
});
