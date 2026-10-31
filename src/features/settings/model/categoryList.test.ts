import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Category } from "@/features/data/model/types";

import { categoryRows, categoryUse, deleteBlock, hasNesting, leastUsedSlot, saveCategory } from "./categoryList";

// A category of a kind under an optional parent
const category = (id: string, over: Partial<Category> = {}): Category => ({
  id,
  name: id,
  icon: "🏷️",
  colorSlot: 1,
  kind: "expense",
  ...over,
});

const state: AppState = {
  ...DEFAULT_STATE,
  categories: [
    category("food", { colorSlot: 3 }),
    category("milk", { parentId: "food", colorSlot: 3 }),
    category("bread", { parentId: "food", colorSlot: 3 }),
    category("fun", { colorSlot: 2 }),
    category("pay", { kind: "income" }),
  ],
  transactions: [{ id: "t", type: "expense", amount: 1, currency: "UAH", categoryId: "milk", date: "2026-10-01" }],
  budgets: [{ categoryId: "fun", limit: 100, currency: "UAH" }],
};

// A category's stored name
const nameOf = (entry: Category) => entry.name;

// The ids of rows with a mark for children
const ids = (rows: ReturnType<typeof categoryRows>) =>
  rows.map((row) => (row.child ? `-${row.category.id}` : row.category.id));

describe("categoryRows", () => {
  it("lists parents with their children, folds them and searches into them", () => {
    expect(ids(categoryRows(state, "expense", "", new Set(), nameOf))).toEqual(["food", "fun"]);
    expect(ids(categoryRows(state, "expense", "", new Set(["food"]), nameOf))).toEqual([
      "food",
      "-milk",
      "-bread",
      "fun",
    ]);
    expect(ids(categoryRows(state, "expense", "MIL", new Set(), nameOf))).toEqual(["food", "-milk"]);
    expect(hasNesting(state, "expense")).toBe(true);
    expect(hasNesting(state, "income")).toBe(false);
  });
});

describe("deleteBlock", () => {
  it("keeps parents and used categories from being deleted", () => {
    const use = categoryUse(state, "2026-10-29");
    expect(use.get("milk")).toMatchObject({ records: 1, recorded: 1 });
    expect(categoryUse(state, "2000-01-01").get("milk")).toMatchObject({ records: 1, recorded: 0 });
    expect(deleteBlock(state, use, "food")).toEqual({ reason: "children", count: 2 });
    expect(deleteBlock(state, use, "milk")).toEqual({ reason: "inUse", records: 1, rules: 0, budgets: 0 });
    expect(deleteBlock(state, use, "fun")).toMatchObject({ budgets: 1 });
    expect(deleteBlock(state, use, "bread")).toBeNull();
  });
});

describe("leastUsedSlot and saveCategory", () => {
  it("picks the least used colour and adds or renames a category", () => {
    expect(leastUsedSlot(state, "expense")).toBe(1);
    const form = { name: " Cinema ", icon: "🎬", colorSlot: 4, parentId: "fun" };
    const added = saveCategory(
      state,
      form,
      null,
      "expense",
      () => "cinema",
      (entry) => entry.name,
    );
    expect(added.categories.at(-1)).toEqual({
      id: "cinema",
      name: "Cinema",
      icon: "🎬",
      colorSlot: 4,
      kind: "expense",
      parentId: "fun",
    });
    const food = state.categories[0] ?? category("food");
    const renamed = saveCategory(
      state,
      { ...form, name: "Groceries", parentId: "fun" },
      food,
      "expense",
      () => "x",
      (entry) => entry.name,
    );
    expect(renamed.categories[0]).toEqual({ id: "food", name: "Groceries", icon: "🎬", colorSlot: 4, kind: "expense" });
  });
});
