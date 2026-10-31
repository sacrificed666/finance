import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { chooseValue } from "@/test/choose";
import { renderWithStore } from "@/test/render";

import CategoriesCard from "./CategoriesCard";

const state: AppState = {
  ...DEFAULT_STATE,
  categories: [
    { id: "food", name: "Food", icon: "🍽️", colorSlot: 3, kind: "expense" },
    { id: "milk", name: "Milk", icon: "🥛", colorSlot: 3, kind: "expense", parentId: "food" },
    { id: "fun", name: "Fun", icon: "🎉", colorSlot: 2, kind: "expense" },
    { id: "pay", name: "Pay", icon: "💼", colorSlot: 1, kind: "income" },
  ],
  transactions: [{ id: "t", type: "expense", amount: 1, currency: "UAH", categoryId: "milk", date: "2026-10-01" }],
};

describe("CategoriesCard", () => {
  it("starts with the groups folded, unfolds one and keeps used or parent categories from deletion", async () => {
    const { user } = renderWithStore(<CategoriesCard />, { state });
    expect(screen.queryByText("Milk")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Expand" }));
    expect(screen.getByText("Milk")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Collapse" }));
    expect(screen.queryByText("Milk")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Delete Food: /u })).toBeDisabled();
  });

  it("deletes an unused category after asking", async () => {
    const { user, probe } = renderWithStore(<CategoriesCard />, { state });
    await user.click(screen.getByRole("button", { name: "Delete Fun" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));
    expect(probe.state.categories.map((entry) => entry.id)).not.toContain("fun");
  });

  it("switches to the income categories", async () => {
    const { user } = renderWithStore(<CategoriesCard />, { state });
    await user.click(screen.getByRole("radio", { name: /^Income/u }));
    expect(screen.getByText("Pay")).toBeInTheDocument();
    expect(screen.queryByText("Fun")).not.toBeInTheDocument();
  });

  it("restores the default categories once and says when they are all there", async () => {
    const { user, probe } = renderWithStore(<CategoriesCard />, { state });
    await user.click(screen.getByRole("button", { name: "Restore default categories" }));
    expect(screen.getByText(/^Added \d+ categories and grouped 0 existing ones\.$/u)).toBeInTheDocument();
    expect(probe.state.categories.length).toBeGreaterThan(state.categories.length);
    expect(probe.undoLabels).toHaveLength(1);
  });

  it("says when the defaults are already there", async () => {
    const { user } = renderWithStore(<CategoriesCard />);
    await user.click(screen.getByRole("button", { name: "Restore default categories" }));
    expect(screen.getByText("All default categories are already here.")).toBeInTheDocument();
  });

  it("searches the categories and says when a kind has none", async () => {
    const { user } = renderWithStore(<CategoriesCard />, {
      state: { ...state, categories: state.categories.filter((entry) => entry.kind === "expense") },
    });
    await user.type(screen.getByPlaceholderText("Search categories…"), "zzz");
    expect(screen.getByText("Nothing matches")).toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText("Search categories…"));
    await user.click(screen.getByRole("radio", { name: /^Income/u }));
    expect(screen.getByText("No categories of this kind yet.")).toBeInTheDocument();
  });

  it("names what keeps a category in use", () => {
    renderWithStore(<CategoriesCard />, {
      state: {
        ...state,
        recurring: [
          {
            id: "r",
            type: "expense",
            amount: 1,
            currency: "UAH",
            categoryId: "fun",
            dayOfMonth: 1,
            startMonth: "2026-01",
          },
        ],
        budgets: [{ categoryId: "fun", limit: 100, currency: "UAH" }],
      },
    });
    expect(
      screen.getByRole("button", {
        name: "Delete Fun: In use by 1 recurring rule, a budget: reassign them before deleting",
      }),
    ).toBeDisabled();
  });

  it("adds a top category and a child that unfolds its parent", async () => {
    const { user, probe } = renderWithStore(<CategoriesCard />, { state });
    expect(screen.getByRole("button", { name: "Expand" })).toHaveAttribute("aria-expanded", "false");
    await user.click(screen.getByRole("button", { name: "Add a subcategory to Food" }));
    await user.type(
      within(screen.getByRole("dialog", { name: "New category" })).getByPlaceholderText("e.g. Sports"),
      "Bread",
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Bread")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse" })).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("button", { name: "Add" }));
    const sheet = screen.getByRole("dialog", { name: "New category" });
    await user.type(within(sheet).getByPlaceholderText("e.g. Sports"), "Travel");
    await user.click(within(sheet).getByRole("button", { name: "Icon" }));
    await user.click(within(sheet).getByRole("radio", { name: "✈️" }));
    await user.click(within(sheet).getByRole("radio", { name: "Colour 7" }));
    await user.click(within(sheet).getByRole("button", { name: "Save" }));
    expect(probe.state.categories.find((entry) => entry.name === "Travel")).toMatchObject({
      icon: "✈️",
      colorSlot: 7,
      kind: "expense",
    });
  });

  it("edits a category and moves it under a parent", async () => {
    const { user, probe } = renderWithStore(<CategoriesCard />, { state });
    await user.click(screen.getByRole("button", { name: /^Food/u }));
    const locked = screen.getByRole("dialog", { name: "Edit category" });
    expect(within(locked).getByRole("combobox", { name: /^Parent category/u })).toBeDisabled();
    expect(within(locked).getByText("This category has subcategories, so it stays top-level")).toBeInTheDocument();
    await user.click(within(locked).getByRole("button", { name: "Cancel" }));

    await user.click(screen.getByRole("button", { name: /^Fun/u }));
    const sheet = screen.getByRole("dialog", { name: "Edit category" });
    await chooseValue(user, within(sheet).getByRole("combobox", { name: /^Parent category/u }), "food");
    const name = within(sheet).getByDisplayValue("Fun");
    await user.clear(name);
    expect(within(sheet).getByRole("button", { name: "Save" })).toBeDisabled();
    await user.type(name, "Snacks");
    await user.click(within(sheet).getByRole("button", { name: "Save" }));
    expect(probe.state.categories.find((entry) => entry.id === "fun")).toMatchObject({
      name: "Snacks",
      parentId: "food",
      colorSlot: 3,
    });
  });
});
