import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import QuarterlyTaxCard from "./QuarterlyTaxCard";

const state: AppState = {
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_STATE.settings, tax: { ...DEFAULT_STATE.settings.tax, regime: "fop3" } },
  transactions: [
    {
      id: "gig",
      type: "income",
      amount: 94000,
      currency: "UAH",
      categoryId: "cat-freelance",
      date: "2026-08-12",
      tax: { ratePct: 6, fixedUAH: 0, gross: 100000, regime: "fop3" },
    },
  ],
};

describe("QuarterlyTaxCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists the quarters with their income and marks one paid", async () => {
    const { user, probe } = renderWithStore(<QuarterlyTaxCard />, { state });
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(4);
    expect(rows[2]).toHaveTextContent("Q3 2026");
    expect(rows[2]).toHaveTextContent("100K ₴");
    expect(rows[0]).toHaveTextContent("-");
    await user.click(within(rows[2]!).getByRole("button", { name: "Not yet" }));
    const sheet = within(screen.getByRole("dialog"));
    expect(sheet.getByRole("switch", { name: "Record as an expense" })).not.toBeChecked();
    await user.click(sheet.getByRole("button", { name: "Save" }));
    expect(Object.keys(probe.state.settings.taxPaid ?? {}).length).toBeGreaterThan(0);
    expect(probe.state.transactions.some((tx) => tx.id.startsWith("tax:"))).toBe(false);
    expect(within(rows[2]!).getByRole("button", { name: "Paid" })).toHaveAttribute(
      "title",
      expect.stringMatching(/^Paid on /u),
    );
  });

  it("shows the figures for the declaration so far", () => {
    renderWithStore(<QuarterlyTaxCard />, { state });
    expect(screen.getByText("Income since 1 January")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Income book (CSV)" })).toBeEnabled();
  });
});
