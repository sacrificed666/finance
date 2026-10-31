import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import CalendarPage from "./CalendarPage";

const state: AppState = {
  ...DEFAULT_STATE,
  transactions: [
    { id: "milk", type: "expense", amount: 100, currency: "UAH", categoryId: "cat-groceries", date: "2026-10-03" },
  ],
};

describe("CalendarPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens on today and shows a picked day's entries", async () => {
    const { user } = renderWithStore(<CalendarPage />, { state });
    expect(screen.getByText("Nothing on this day.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "3 Oct 2026 · 1 entry" }));
    expect(screen.getByRole("button", { name: /Groceries/u })).toBeInTheDocument();
  });

  it("adds an entry on the picked day", async () => {
    const { user } = renderWithStore(<CalendarPage />, { state });
    await user.click(screen.getAllByRole("button", { name: "Add" })[0] ?? document.body);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
