import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import SettingsHero from "./SettingsHero";

// An expense on a date
const entry = (date: string): Transaction => ({
  id: date,
  type: "expense",
  amount: 1,
  currency: "UAH",
  categoryId: "cat-groceries",
  date,
});

const state: AppState = {
  ...DEFAULT_STATE,
  transactions: [entry("2026-09-05"), entry("2026-10-01"), entry("2026-10-02")],
};

describe("SettingsHero", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts the entries since the first and pictures how many come a month", () => {
    renderWithStore(<SettingsHero />, { state });
    expect(screen.getByText("3 entries")).toBeInTheDocument();
    expect(screen.getByText("Tracking since September 2026")).toBeInTheDocument();
    expect(screen.getByRole("figure", { name: "Entries a month" })).toBeInTheDocument();
    expect(screen.getByText("≈ 1.5")).toBeInTheDocument();
  });

  it("has no picture before the first entry", () => {
    renderWithStore(<SettingsHero />);
    expect(screen.getByText("0 entries")).toBeInTheDocument();
    expect(screen.queryByRole("figure")).not.toBeInTheDocument();
  });
});
