import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";
import type { downloadFile } from "@/shared/lib/download";
import { chooseValue } from "@/test/choose";
import { renderWithStore } from "@/test/render";

import ReportsPage from "./ReportsPage";

const download = vi.hoisted(() => vi.fn<typeof downloadFile>());

vi.mock(import("@/shared/lib/download"), async (importOriginal) => ({
  ...(await importOriginal()),
  downloadFile: download,
}));

// An expense in hryvnias
const entry = (id: string, over: Partial<Transaction>): Transaction => ({
  id,
  type: "expense",
  amount: 100,
  currency: "UAH",
  categoryId: "cat-groceries",
  date: "2026-10-05",
  ...over,
});

const state: AppState = {
  ...DEFAULT_STATE,
  transactions: [
    entry("milk", { amount: 300, tags: ["home"], note: "Big shop" }),
    entry("pay", { type: "income", categoryId: "cat-salary", amount: 2000 }),
    entry("old", { amount: 100, date: "2026-09-05" }),
  ],
};

describe("ReportsPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
    download.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState(null, "", "/");
  });

  it("reports the month against the one before", () => {
    renderWithStore(<ReportsPage />, { state });
    expect(screen.getByText("+1,700 ₴")).toBeInTheDocument();
    expect(screen.getByText("Compared with September 2026 up to the same day")).toBeInTheDocument();
    expect(screen.getByText("Big shop")).toBeInTheDocument();
    expect(screen.getByText("#home")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
  });

  it("opens at a month a link names, but never after this one", () => {
    const { unmount } = renderWithStore(<ReportsPage month="2026-09" />, { state });
    expect(screen.getByText("Compared with August 2026")).toBeInTheDocument();
    unmount();
    renderWithStore(<ReportsPage month="2027-01" />, { state });
    expect(screen.getByText("Compared with September 2026 up to the same day")).toBeInTheDocument();
  });

  it("draws where the month's income went", () => {
    renderWithStore(<ReportsPage />, { state });
    expect(screen.getByRole("heading", { name: "Money flow" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Money flow" })).toHaveTextContent("Kept");
  });

  it("steps back a period and switches to the year with its review", async () => {
    const { user } = renderWithStore(<ReportsPage />, { state });
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByText("Compared with August 2026")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Year" }));
    expect(screen.getByText("Year in review")).toBeInTheDocument();
  });

  it("sets the month against a year before, and a chosen range against the months before it", async () => {
    const { user } = renderWithStore(<ReportsPage />, { state });
    await user.click(screen.getByRole("radio", { name: "Year before" }));
    expect(screen.getByText("Compared with October 2025 up to the same day")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Period before" }));
    await user.click(screen.getByRole("radio", { name: "Range" }));
    expect(screen.queryByRole("button", { name: "Previous month" })).not.toBeInTheDocument();
    await chooseValue(user, screen.getByRole("combobox", { name: "From: month" }), "8");
    expect(screen.getByText("Compared with May - Jul 2026 up to the same day")).toBeInTheDocument();
    expect(window.location.search).toBe("?period=custom&from=2026-08&to=2026-10");
  });

  it("opens with the period, range and comparison its address names", () => {
    renderWithStore(<ReportsPage period="custom" compare="lastYear" range={{ from: "2026-09", to: "2026-07" }} />, {
      state,
    });
    expect(screen.getByRole("radio", { name: "Range" })).toBeChecked();
    expect(screen.getByText(/^Compared with/u).textContent).toBe("Compared with Jul - Sept 2025");
  });

  it("downloads the report as a spreadsheet", async () => {
    const { user } = renderWithStore(<ReportsPage />, { state });
    await user.click(screen.getByRole("button", { name: "CSV" }));
    expect(download).toHaveBeenCalledWith(
      "report-2026-10.csv",
      expect.stringContaining("Food"),
      "text/csv;charset=utf-8",
    );
  });
});
