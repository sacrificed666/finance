import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import StartCard from "./StartCard";

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [{ id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 1000 }],
};

describe("StartCard", () => {
  it("ticks off a done step and leads to the pages of the rest and to the bank import", () => {
    renderWithStore(<StartCard />, { state });
    expect(screen.getByRole("link", { name: /^Add accounts.*Done$/u })).toHaveAttribute("href", "/accounts");
    expect(screen.getByRole("link", { name: /^Log income/u })).toHaveAttribute("href", "/income");
    expect(screen.getByRole("link", { name: /^Record an expense/u })).toHaveAttribute("href", "/transactions");
    expect(screen.getByRole("link", { name: "Or import a statement from your bank" })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("is gone once every step is done", () => {
    const { container } = renderWithStore(<StartCard />, {
      state: {
        ...state,
        transactions: [
          { id: "in", type: "income", amount: 9, currency: "UAH", categoryId: "cat-salary", date: "2026-10-01" },
          { id: "out", type: "expense", amount: 1, currency: "UAH", categoryId: "cat-groceries", date: "2026-10-02" },
        ],
      },
    });
    expect(container).toBeEmptyDOMElement();
  });
});
