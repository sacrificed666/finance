import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import CashFlowCard from "./CashFlowCard";

describe("CashFlowCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("invites to add the first entry", () => {
    renderWithStore(<CashFlowCard />);
    expect(screen.getByText("No data for the chart yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add a transaction" })).toHaveAttribute("href", "/transactions");
  });

  it("charts the months of the chosen period, offering only the periods the history fills", async () => {
    const state: AppState = {
      ...DEFAULT_STATE,
      transactions: [
        { id: "pay", type: "income", amount: 1000, currency: "UAH", categoryId: "cat-salary", date: "2026-10-01" },
        { id: "old", type: "expense", amount: 10, currency: "UAH", categoryId: "cat-groceries", date: "2025-09-15" },
      ],
    };
    const { user } = renderWithStore(<CashFlowCard />, { state });
    expect(screen.queryByText("No data for the chart yet")).not.toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "2Y" })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "6M" }));
    expect(screen.getByRole("radio", { name: "6M" })).toBeChecked();
  });

  it("drops the period tabs while the history is shorter than the shortest period", () => {
    const state: AppState = {
      ...DEFAULT_STATE,
      transactions: [
        { id: "pay", type: "income", amount: 1000, currency: "UAH", categoryId: "cat-salary", date: "2026-10-01" },
      ],
    };
    renderWithStore(<CashFlowCard />, { state });
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });
});
