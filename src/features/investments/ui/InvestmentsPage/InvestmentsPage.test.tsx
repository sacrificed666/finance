import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Investment } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import InvestmentsPage from "./InvestmentsPage";

const ended: Investment = {
  id: "term",
  name: "Term deposit",
  kind: "deposit",
  currency: "UAH",
  principal: 10000,
  annualRatePct: 10,
  startDate: "2025-10-10",
  endDate: "2026-10-01",
  compounding: "payout",
  compoundingFreq: "monthly",
};

const state: AppState = { ...DEFAULT_STATE, investments: [ended] };

describe("InvestmentsPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("invites to add the first investment", async () => {
    const { user } = renderWithStore(<InvestmentsPage />);
    expect(screen.getByText("No investments yet")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Investment" })[0] ?? document.body);
    expect(screen.getByRole("dialog", { name: "New investment" })).toBeInTheDocument();
  });

  it("deletes a position after asking", async () => {
    const { user, probe } = renderWithStore(<InvestmentsPage />, { state });
    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Delete investment" }));
    const confirm = screen.getByRole("dialog", { name: "Delete this investment?" });
    await user.click(within(confirm).getByRole("button", { name: "Delete" }));
    expect(probe.state.investments).toEqual([]);
    expect(probe.undoLabels).toContain("Investment deleted");
  });

  it("withdraws an ended term after asking", async () => {
    const { user, probe } = renderWithStore(<InvestmentsPage />, { state });
    await user.click(screen.getByRole("button", { name: "Withdraw" }));
    const confirm = screen.getByRole("dialog", { name: "Withdraw this investment?" });
    await user.click(within(confirm).getByRole("button", { name: "Withdraw" }));
    expect(probe.state.investments).toEqual([]);
    expect(probe.undoLabels).toContain("Investment withdrawn");
  });

  it("opens an ended term for reinvesting", async () => {
    const { user } = renderWithStore(<InvestmentsPage />, { state });
    await user.click(screen.getByRole("button", { name: "Reinvest" }));
    expect(screen.getByRole("dialog", { name: "Reinvest for another term" })).toBeInTheDocument();
  });
});
