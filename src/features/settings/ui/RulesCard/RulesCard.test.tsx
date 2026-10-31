import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import RulesCard from "./RulesCard";

describe("RulesCard", () => {
  it("removes a rule", async () => {
    const state: AppState = {
      ...DEFAULT_STATE,
      rules: [{ id: "r", match: "silpo", categoryId: "cat-groceries", type: "expense" }],
    };
    const { user, probe } = renderWithStore(<RulesCard />, { state });
    expect(screen.getByText("“silpo”")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /silpo/u }));
    expect(probe.state.rules).toEqual([]);
  });

  it("needs words and a category before adding", () => {
    renderWithStore(<RulesCard />);
    expect(screen.getByRole("button", { name: /^Add/u })).toBeDisabled();
  });

  it("adds rules for costs and income, the second with Enter", async () => {
    const { user, probe } = renderWithStore(<RulesCard />);
    const words = screen.getByRole("textbox", { name: "Description contains" });
    await user.type(words, "Silpo");
    await user.click(screen.getByRole("combobox", { name: /^Category/u }));
    await user.click(screen.getByRole("option", { name: /Groceries/u }));
    await user.click(screen.getByRole("button", { name: /^Add/u }));
    expect(words).toHaveValue("");
    await user.click(screen.getByRole("radio", { name: "Income" }));
    await user.type(words, "Salary");
    await user.keyboard("{Enter}");
    expect(probe.state.rules).toHaveLength(1);
    await user.click(screen.getByRole("combobox", { name: /^Category/u }));
    await user.click(screen.getByRole("option", { name: /^Salary/u }));
    await user.click(words);
    await user.keyboard("{Enter}");
    expect(probe.state.rules).toEqual([
      expect.objectContaining({ match: "Silpo", categoryId: "cat-groceries", type: "expense" }),
      expect.objectContaining({ match: "Salary", categoryId: "cat-salary", type: "income" }),
    ]);
    expect(screen.getAllByText("Income").length).toBeGreaterThan(1);
  });
});
