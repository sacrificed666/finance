import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, RecurringRule } from "@/features/data/model/types";
import { chooseValue } from "@/test/choose";
import { renderWithStore } from "@/test/render";

import RecurringSheet from "./RecurringSheet";

const rent: RecurringRule = {
  id: "rent",
  type: "expense",
  amount: 12000,
  currency: "UAH",
  categoryId: "cat-rent",
  dayOfMonth: 5,
  startMonth: "2026-09",
};

describe("RecurringSheet", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-15T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds a rule and posts its months", async () => {
    const onClose = vi.fn<() => void>();
    const { user, probe } = renderWithStore(<RecurringSheet target="new" onClose={onClose} />);
    expect(screen.getByText("Enter an amount greater than zero.")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("0"), "900");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.recurring).toEqual([expect.objectContaining({ amount: 900, startMonth: "2026-10" })]);
    expect(probe.state.transactions.some((tx) => tx.recurringId === probe.state.recurring[0]?.id)).toBe(true);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("adds a weekly rule booked every seven days", async () => {
    const { user, probe } = renderWithStore(<RecurringSheet target="new" onClose={vi.fn<() => void>()} />);
    await user.click(screen.getByRole("radio", { name: "Weekly" }));
    expect(screen.getByText("First day")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("0"), "300");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.recurring[0]).toMatchObject({ period: "weekly", amount: 300 });
    const dates = probe.state.transactions.map((tx) => tx.date).toSorted();
    expect(dates.slice(0, 3)).toEqual(["2026-10-01", "2026-10-08", "2026-10-15"]);
  });

  it("splits a purchase into instalments that end on their own", async () => {
    const { user, probe } = renderWithStore(<RecurringSheet target="new" onClose={vi.fn<() => void>()} />);
    await user.click(screen.getByRole("switch", { name: /Pay in instalments/u }));
    expect(screen.queryByRole("radio", { name: "Weekly" })).not.toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("0"), "12000");
    expect(screen.getByText("Set 2 to 120 payments")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Payments" }), "4");
    expect(screen.getByText("4 payments of 3,000.00 ₴, the last in January 2027")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.recurring[0]).toMatchObject({
      amount: 3000,
      endMonth: "2027-01",
      instalment: { total: 12000, count: 4 },
    });
    expect(probe.state.transactions).toHaveLength(4);
  });

  it("tells about a day out of range", async () => {
    const { user } = renderWithStore(<RecurringSheet target={rent} onClose={vi.fn<() => void>()} />);
    expect(screen.getByText(/Saving changes the months still to come/u)).toBeInTheDocument();
    const day = screen.getByDisplayValue("5");
    await user.clear(day);
    await user.type(day, "32");
    expect(screen.getByText("The day of the month has to be a whole number between 1 and 31.")).toBeInTheDocument();
  });

  it("deletes a rule with what it posted", async () => {
    const state: AppState = { ...DEFAULT_STATE, recurring: [rent] };
    const { user, probe } = renderWithStore(<RecurringSheet target={rent} onClose={vi.fn<() => void>()} />, { state });
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getAllByRole("button", { name: "Delete" }).at(-1)!);
    expect(probe.state.recurring).toEqual([]);
    expect(probe.undoLabels).toContain("Recurring rule deleted");
  });

  it("edits an income rule field by field", async () => {
    const state: AppState = {
      ...DEFAULT_STATE,
      recurring: [rent],
      savings: [{ id: "card", name: "Card", icon: "💳", kind: "card", currency: "USD", openingBalance: 0 }],
    };
    const onClose = vi.fn<() => void>();
    const { user, probe } = renderWithStore(<RecurringSheet target={rent} onClose={onClose} />, { state });
    await user.click(screen.getByRole("radio", { name: "Income" }));
    await user.click(screen.getByRole("radio", { name: /USD/u }));
    await user.click(screen.getByRole("combobox", { name: /^Category/u }));
    await user.click(screen.getByRole("option", { name: /^Salary/u }));
    await user.type(screen.getByPlaceholderText("Optional"), "  Pay  ");
    await user.click(screen.getByRole("combobox", { name: /^Account/u }));
    await user.click(screen.getByRole("option", { name: /Card/u }));
    await chooseValue(user, screen.getByRole("combobox", { name: "From: month" }), "10");
    await chooseValue(user, screen.getByRole("combobox", { name: "Until (optional): year" }), "2027");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.recurring[0]).toMatchObject({
      type: "income",
      currency: "USD",
      categoryId: "cat-salary",
      note: "Pay",
      accountId: "card",
      startMonth: "2026-10",
      endMonth: "2027-10",
    });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
