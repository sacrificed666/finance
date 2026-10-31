import { describe, expect, it } from "vitest";

import type { Category } from "@/features/data/model/types";

import { DEFAULT_CATEGORIES, DEFAULT_STATE, mergeDefaultCategories } from "./defaults";

describe("defaults", () => {
  it("starts with every default category and the settings of a first visit", () => {
    expect(DEFAULT_STATE.categories).toBe(DEFAULT_CATEGORIES);
    expect(new Set(DEFAULT_CATEGORIES.map((category) => category.id)).size).toBe(DEFAULT_CATEGORIES.length);
    expect(DEFAULT_STATE.settings).toMatchObject({ baseCurrency: "UAH", locale: "en", ratesSource: "manual" });
  });

  it("adds the missing defaults and links old ones to their parents", () => {
    const rent: Category = { id: "cat-rent", name: "My rent", icon: "🔑", colorSlot: 1, kind: "expense" };
    const custom: Category = { id: "mine", name: "Mine", icon: "⭐", colorSlot: 5, kind: "expense" };
    const { categories, added, linked } = mergeDefaultCategories([rent, custom]);
    expect(linked).toBe(1);
    expect(added).toBe(DEFAULT_CATEGORIES.length - 1);
    expect(categories[0]).toEqual({ ...rent, parentId: "cat-housing" });
    expect(categories[1]).toBe(custom);
  });

  it("leaves categories of another kind or with a parent alone", () => {
    const flipped: Category = { id: "cat-rent", name: "Rent", icon: "🔑", colorSlot: 1, kind: "income" };
    const placed: Category = {
      id: "cat-fuel",
      name: "Fuel",
      icon: "⛽",
      colorSlot: 2,
      kind: "expense",
      parentId: "mine",
    };
    const { categories, linked } = mergeDefaultCategories([flipped, placed]);
    expect(linked).toBe(0);
    expect(categories.slice(0, 2)).toEqual([flipped, placed]);
    expect(mergeDefaultCategories(DEFAULT_CATEGORIES)).toMatchObject({ added: 0, linked: 0 });
  });
});
