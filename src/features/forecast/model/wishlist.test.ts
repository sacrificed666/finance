import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, WishItem } from "@/features/data/model/types";

import { deleteWish, initialWishForm, saveWish, wishEvents, wishlistPlan, wishProblem } from "./wishlist";

// A wish with the given fields
const wish = (id: string, over: Partial<WishItem>): WishItem => ({
  id,
  name: id,
  icon: "🎁",
  price: 1000,
  currency: "UAH",
  priority: "normal",
  createdAt: "2026-01-01",
  ...over,
});

const state: AppState = {
  ...DEFAULT_STATE,
  wishlist: [
    wish("bike", { price: 3000 }),
    wish("phone", { priority: "high", price: 5000 }),
    wish("cup", { price: 500 }),
  ],
  transactions: [
    { id: "pay", type: "income", amount: 3000, currency: "UAH", categoryId: "cat-salary", date: "2026-09-01" },
    { id: "food", type: "expense", amount: 1000, currency: "UAH", categoryId: "cat-groceries", date: "2026-09-02" },
  ],
};

describe("wishlistPlan", () => {
  it("orders the wishes by priority and price and dates each at the savings pace", () => {
    const plan = wishlistPlan(state, "2026-10");
    expect(plan.items.map((item) => item.id)).toEqual(["phone", "cup", "bike"]);
    expect(plan.pace).toBe(2000);
    expect(plan.total).toBe(8500);
    expect([...plan.affordable]).toEqual([
      ["phone", "2026-12"],
      ["cup", "2026-12"],
      ["bike", "2027-02"],
    ]);
  });
});

describe("wishEvents", () => {
  it("turns the wishes with a month into sums going out", () => {
    expect(wishEvents([wish("tv", { month: "2027-01", icon: "📺" }), wish("later", {})])).toEqual([
      { id: "wish:tv", month: "2027-01", amount: -1000, currency: "UAH", note: "📺 tv" },
    ]);
  });
});

describe("the wish form", () => {
  it("names the first problem", () => {
    const blank = initialWishForm("new");
    expect(wishProblem(blank)).toBe("wish.problem.name");
    expect(wishProblem({ ...blank, name: "Bike", price: "0" })).toBe("wish.problem.price");
    expect(wishProblem({ ...blank, name: "Bike", price: "10", url: "http://shop" })).toBe("wish.problem.url");
    expect(wishProblem({ ...blank, name: "Bike", price: "10" })).toBeNull();
  });

  it("adds, changes and deletes a wish", () => {
    const form = { ...initialWishForm("new"), name: " Bike ", price: "12000", url: " " };
    const added = saveWish(DEFAULT_STATE, form, "new", () => "w", "2026-10-10");
    expect(added.wishlist).toEqual([
      expect.objectContaining({ id: "w", name: "Bike", price: 12000, url: undefined, createdAt: "2026-10-10" }),
    ]);
    const stored = added.wishlist[0] ?? wish("w", {});
    const changed = saveWish(
      added,
      { ...initialWishForm(stored), priority: "low" },
      stored,
      () => "unused",
      "2026-10-11",
    );
    expect(changed.wishlist).toEqual([expect.objectContaining({ id: "w", priority: "low", createdAt: "2026-10-10" })]);
    expect(deleteWish(changed, "w").wishlist).toEqual([]);
  });
});
