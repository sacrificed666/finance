import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import DashboardPage from "./DashboardPage";

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [{ id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 1000 }],
};

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with the first steps alone, with nothing to arrange or dismiss", () => {
    renderWithStore(<DashboardPage />);
    expect(screen.getByRole("link", { name: /^Add accounts/u })).toHaveAttribute("href", "/accounts");
    expect(screen.getByText("0 of 3 done")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Arrange the overview" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument();
  });

  it("keeps the first steps above the cards until they are put away", async () => {
    const { user, probe } = renderWithStore(<DashboardPage />, { state });
    expect(screen.getByText("1 of 3 done")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(probe.state.settings.dashboard?.hidden).toEqual(["start"]);
    expect(screen.queryByText("1 of 3 done")).not.toBeInTheDocument();
  });

  it("stops offering the first steps in the layout settings once they are done", async () => {
    const { user } = renderWithStore(<DashboardPage />, {
      state: {
        ...state,
        transactions: [
          { id: "in", type: "income", amount: 9, currency: "UAH", categoryId: "cat-salary", date: "2026-10-01" },
          { id: "out", type: "expense", amount: 1, currency: "UAH", categoryId: "cat-groceries", date: "2026-10-02" },
        ],
      },
    });
    expect(screen.queryByText(/of 3 done/u)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Arrange the overview" }));
    expect(screen.queryByRole("switch", { name: "Show First steps" })).not.toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Show Quick add" })).toBeInTheDocument();
  });

  it("switches the base currency", async () => {
    const { user, probe } = renderWithStore(<DashboardPage />, { state });
    const [header] = screen.getAllByRole("radio", { name: "USD" });
    await user.click(header!);
    expect(probe.state.settings.baseCurrency).toBe("USD");
  });

  it("hides a card from the layout settings and keeps the layout", async () => {
    const { user, probe } = renderWithStore(<DashboardPage />, { state });
    expect(screen.getByText("Your progress")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Arrange the overview" }));
    await user.click(screen.getByRole("switch", { name: "Show Your progress" }));
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(probe.state.settings.dashboard?.hidden).toEqual(["progress"]);
    expect(screen.queryByText("Your progress")).not.toBeInTheDocument();
  });
});
