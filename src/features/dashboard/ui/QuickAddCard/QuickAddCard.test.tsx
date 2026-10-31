import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import QuickAddCard from "./QuickAddCard";

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [{ id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 0 }],
};

describe("QuickAddCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds an expense for today to the first account and clears the amount", async () => {
    const { user, probe } = renderWithStore(<QuickAddCard />, { state });
    const button = screen.getByRole("button", { name: "Add for today" });
    expect(button).toBeDisabled();
    await user.type(screen.getByPlaceholderText("0"), "50");
    await user.type(screen.getByPlaceholderText("Optional"), "  Lunch ");
    await user.click(button);
    expect(probe.state.transactions).toEqual([
      expect.objectContaining({
        type: "expense",
        amount: 50,
        currency: "UAH",
        date: "2026-10-10",
        accountId: "card",
        note: "Lunch",
      }),
    ]);
    expect(screen.getByRole("button", { name: "Added ✓" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("0")).toHaveValue("");
  });

  it("adds an income to an income category", async () => {
    const { user, probe } = renderWithStore(<QuickAddCard />, { state });
    await user.click(screen.getByRole("radio", { name: "Income" }));
    await user.type(screen.getByPlaceholderText("0"), "1000");
    await user.click(screen.getByRole("button", { name: "Add for today" }));
    const added = probe.state.transactions[0];
    expect(added?.type).toBe("income");
    expect(state.categories.find((entry) => entry.id === added?.categoryId)?.kind).toBe("income");
  });
});
