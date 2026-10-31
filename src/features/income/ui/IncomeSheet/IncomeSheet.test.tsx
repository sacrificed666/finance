import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";
import { chooseValue } from "@/test/choose";
import { renderWithStore } from "@/test/render";

import IncomeSheet from "./IncomeSheet";

const state: AppState = {
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_STATE.settings, tax: { ...DEFAULT_STATE.settings.tax, regime: "none" } },
};

const salary: Transaction = {
  id: "pay",
  type: "income",
  amount: 40000,
  currency: "UAH",
  categoryId: "cat-salary",
  date: "2026-10-05",
};

describe("IncomeSheet", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds a plain income dated today", async () => {
    const onClose = vi.fn<() => void>();
    const { user, probe } = renderWithStore(<IncomeSheet target="new" onClose={onClose} />, { state });
    expect(screen.getByText("Enter an amount greater than zero.")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("0"), "1500");
    expect(screen.getByText("In every currency")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.transactions).toEqual([expect.objectContaining({ amount: 1500, date: "2026-10-10" })]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("adds up a day rate and takes a custom tax off it", async () => {
    const { user, probe } = renderWithStore(<IncomeSheet target="new" onClose={vi.fn<() => void>()} />, { state });
    await user.click(screen.getByRole("radio", { name: "Day rate" }));
    await user.type(screen.getByPlaceholderText("e.g. 21"), "10");
    await user.type(screen.getByRole("textbox", { name: /^Daily rate/u }), "100");
    await user.click(screen.getByRole("switch", { name: "Apply tax" }));
    await chooseValue(user, screen.getByRole("combobox", { name: /^Tax regime/u }), "custom");
    const [rate, fixed] = [screen.getByPlaceholderText("e.g. 6"), screen.getByRole("textbox", { name: /^Fixed, ₴/u })];
    await user.clear(rate);
    await user.type(rate, "10");
    await user.clear(fixed);
    expect(screen.getByText("Net take-home")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.transactions[0]).toMatchObject({ amount: 900, breakdown: { days: 10, dailyRate: 100 } });
  });

  it("deletes an income after asking", async () => {
    const withSalary = { ...state, transactions: [salary] };
    const { user, probe } = renderWithStore(<IncomeSheet target={salary} onClose={vi.fn<() => void>()} />, {
      state: withSalary,
    });
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getAllByRole("button", { name: "Delete" }).at(-1)!);
    expect(probe.state.transactions).toEqual([]);
    expect(probe.undoLabels).toContain("Income deleted");
  });
});
