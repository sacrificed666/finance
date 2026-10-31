import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";

import { addRule, removeRule, ruleReady } from "./rules";

describe("rules", () => {
  it("needs words and a category of the rule's type", () => {
    expect(ruleReady(DEFAULT_STATE, { match: "silpo", categoryId: "cat-groceries", type: "expense" })).toBe(true);
    expect(ruleReady(DEFAULT_STATE, { match: " ", categoryId: "cat-groceries", type: "expense" })).toBe(false);
    expect(ruleReady(DEFAULT_STATE, { match: "silpo", categoryId: "cat-groceries", type: "income" })).toBe(false);
  });

  it("adds a trimmed rule and removes it", () => {
    const added = addRule(DEFAULT_STATE, { match: " silpo ", categoryId: "cat-groceries", type: "expense" }, () => "r");
    expect(added.rules).toEqual([{ id: "r", match: "silpo", categoryId: "cat-groceries", type: "expense" }]);
    expect(removeRule(added, "r").rules).toEqual([]);
  });
});
