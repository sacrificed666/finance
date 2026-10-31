import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import ForecastPage from "./ForecastPage";

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [{ id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 30000 }],
};

describe("ForecastPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("invites to add savings when there is nothing to project", () => {
    renderWithStore(<ForecastPage />);
    expect(screen.getByText("Nothing to project yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Accounts" })).toHaveAttribute("href", "/accounts");
  });

  it("projects the money and shows it in another currency", async () => {
    const { user } = renderWithStore(<ForecastPage />, { state });
    expect(screen.getByText("Wealth projection · UAH")).toBeInTheDocument();
    const [shownIn] = screen.getAllByRole("radio", { name: "USD" });
    if (shownIn) await user.click(shownIn);
    expect(screen.getByText("Wealth projection · USD")).toBeInTheDocument();
  });

  it("moves planned events an older version kept in the browser into the data", () => {
    localStorage.setItem(
      "finance-tracker:view:forecast.events",
      JSON.stringify([{ id: "old", month: "2027-01", amount: -500, currency: "UAH", note: "Old" }]),
    );
    const { probe } = renderWithStore(<ForecastPage />, { state });
    expect(probe.state.plannedEvents).toEqual([expect.objectContaining({ id: "old" })]);
    expect(localStorage.getItem("finance-tracker:view:forecast.events")).toBeNull();
  });
});
