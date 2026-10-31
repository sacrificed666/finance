import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { chooseValue } from "@/test/choose";
import { renderWithStore } from "@/test/render";

import BudgetSheet from "./BudgetSheet";

const state: AppState = { ...DEFAULT_STATE, budgets: [{ categoryId: "cat-food", limit: 9000, currency: "UAH" }] };

describe("BudgetSheet", () => {
  it("adds a budget with a carried over rest", async () => {
    const onClose = vi.fn<() => void>();
    const { user, probe } = renderWithStore(<BudgetSheet target="new" month="2026-10" onClose={onClose} />, { state });
    expect(screen.getByRole("dialog", { name: "New budget" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    await user.type(screen.getByRole("textbox"), "2500");
    await user.click(screen.getByRole("switch", { name: "Carry over what’s left" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.budgets).toHaveLength(2);
    expect(probe.state.budgets[1]).toMatchObject({ limit: 2500, currency: "UAH", rollover: true });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("sets a yearly limit, which carries nothing over", async () => {
    const { user, probe } = renderWithStore(
      <BudgetSheet target="new" month="2026-10" onClose={vi.fn<() => void>()} />,
      { state },
    );
    await user.click(screen.getByRole("radio", { name: "Yearly" }));
    expect(screen.queryByRole("switch", { name: "Carry over what’s left" })).not.toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: /Yearly limit/u }), "60000");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.budgets[1]).toMatchObject({ limit: 60000, period: "yearly" });
    expect(probe.state.budgets[1]?.rollover).toBeUndefined();
  });

  it("deletes a budget after asking", async () => {
    const { user, probe } = renderWithStore(
      <BudgetSheet target={state.budgets[0]!} month="2026-10" onClose={vi.fn<() => void>()} />,
      {
        state,
      },
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete this budget?")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Delete" }).at(-1)!);
    expect(probe.state.budgets).toEqual([]);
    expect(probe.undoLabels).toContain("Budget deleted");
  });

  it("fills in the limit the category's spending suggests", async () => {
    const spending: AppState = {
      ...state,
      transactions: [
        { id: "a", type: "expense", amount: 3000, currency: "UAH", categoryId: "cat-groceries", date: "2026-09-04" },
      ],
    };
    const { user } = renderWithStore(
      <BudgetSheet target={state.budgets[0]!} month="2026-10" onClose={vi.fn<() => void>()} />,
      {
        state: spending,
      },
    );
    await user.click(screen.getByRole("button", { name: /^Use the 3-month average: 1,000.₴$/u }));
    expect(screen.getByDisplayValue("1000")).toBeInTheDocument();
  });

  it("moves part of this month's rest into another budget", async () => {
    const two: AppState = {
      ...state,
      budgets: [...state.budgets, { categoryId: "cat-transport", limit: 2000, currency: "UAH" }],
    };
    const onClose = vi.fn<() => void>();
    const { user, probe } = renderWithStore(
      <BudgetSheet target={two.budgets[0]!} month="2026-10" onClose={onClose} />,
      {
        state: two,
      },
    );
    await chooseValue(user, screen.getByRole("combobox", { name: "Move to" }), "cat-transport");
    const amount = screen.getByRole("textbox", { name: "Amount to move" });
    await user.clear(amount);
    await user.type(amount, "1500");
    await user.click(screen.getByRole("button", { name: "Move" }));
    expect(probe.state.budgets.map((budget) => budget.moved)).toEqual([{ "2026-10": -1500 }, { "2026-10": 1500 }]);
    expect(probe.undoLabels.at(-1)).toMatch(/^Moved 1,500.₴ to Transport$/u);
    expect(onClose).toHaveBeenCalled();
  });
});
