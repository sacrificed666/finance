import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import ReconcileSheet from "./ReconcileSheet";

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [{ id: "black", name: "Black", icon: "💳", kind: "card", currency: "UAH", openingBalance: 1000 }],
};

describe("ReconcileSheet", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("books the difference to the bank's balance", async () => {
    const onClose = vi.fn<() => void>();
    const { user, probe } = renderWithStore(<ReconcileSheet accountId="black" amount={1250} onClose={onClose} />, {
      state,
    });
    await user.click(screen.getByRole("button", { name: /Adjust/u }));
    expect(probe.state.transactions).toEqual([
      expect.objectContaining({ type: "income", amount: 250, accountId: "black", date: "2026-10-10" }),
    ]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("says when the balance already matches", () => {
    renderWithStore(<ReconcileSheet accountId="black" amount={1000} onClose={vi.fn<() => void>()} />, { state });
    expect(screen.getByRole("button", { name: /Adjust/u })).toBeDisabled();
  });
});
