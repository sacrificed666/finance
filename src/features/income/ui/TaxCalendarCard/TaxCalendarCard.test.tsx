import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import TaxCalendarCard from "./TaxCalendarCard";

const state: AppState = {
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_STATE.settings, tax: { ...DEFAULT_STATE.settings.tax, regime: "fop3" } },
};

describe("TaxCalendarCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists the next payments and books one as paid on the day picked", async () => {
    const { user, probe } = renderWithStore(<TaxCalendarCard />, { state });
    expect(screen.getByRole("heading", { name: "Taxes to pay" })).toBeInTheDocument();
    expect(screen.getByText(/ payments?$/u)).toBeInTheDocument();
    expect(screen.getByText(/^Next: /u)).toBeInTheDocument();
    const [first] = screen.getAllByRole("button", { name: "Mark as paid" });
    await user.click(first!);
    const sheet = within(screen.getByRole("dialog"));
    fireEvent.change(sheet.getByLabelText("Paid on"), { target: { value: "2026-10-03" } });
    expect(sheet.getByRole("switch", { name: "Record as an expense" })).toBeChecked();
    await user.click(sheet.getByRole("button", { name: "Save" }));
    expect(Object.values(probe.state.settings.taxPaid ?? {})).toEqual(["2026-10-03"]);
    expect(probe.state.transactions).toEqual([expect.objectContaining({ type: "expense", date: "2026-10-03" })]);
    expect(probe.undoLabels.at(-1)).toMatch(/marked as paid$/u);
  });

  it("stays away for a regime without a calendar", () => {
    const general = {
      ...state,
      settings: { ...state.settings, tax: { ...state.settings.tax, regime: "general" as const } },
    };
    const { container } = renderWithStore(<TaxCalendarCard />, { state: general });
    expect(container).toBeEmptyDOMElement();
  });
});
