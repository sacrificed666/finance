import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, RecurringRule } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import StopPlansSheet from "./StopPlansSheet";

// A monthly expense rule since spring
const rule = (id: string, categoryId: string): RecurringRule => ({
  id,
  type: "expense",
  amount: 5000,
  currency: "UAH",
  categoryId,
  dayOfMonth: 1,
  startMonth: "2026-04",
});

const rules = [rule("food", "cat-groceries"), rule("rent", "cat-rent")];
const state: AppState = { ...DEFAULT_STATE, recurring: rules };

describe("StopPlansSheet", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-15T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ticks the plans, leaves the fixed payments and stops the ticked rules", async () => {
    const onClose = vi.fn<() => void>();
    const { user, probe } = renderWithStore(<StopPlansSheet rules={rules} onClose={onClose} />, { state });
    const [food, rent] = screen.getAllByRole("checkbox");
    expect(food).toBeChecked();
    expect(rent).not.toBeChecked();
    expect(screen.getByText(/Looks like a fixed payment/u)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Stop 1 rule" }));
    expect(probe.state.recurring.find((item) => item.id === "food")?.endMonth).toBe("2026-09");
    expect(probe.undoLabels).toContain("Rules stopped");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("stops nothing when every rule is unticked", async () => {
    const { user } = renderWithStore(<StopPlansSheet rules={rules} onClose={vi.fn<() => void>()} />, { state });
    await user.click(screen.getAllByRole("checkbox")[0]!);
    expect(screen.getByRole("button", { name: "Stop 0 rules" })).toBeDisabled();
  });
});
