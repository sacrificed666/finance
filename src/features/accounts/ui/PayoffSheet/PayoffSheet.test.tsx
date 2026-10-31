import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import PayoffSheet from "./PayoffSheet";

const state: AppState = {
  ...DEFAULT_STATE,
  debts: [
    {
      id: "card",
      name: "Card",
      icon: "💳",
      kind: "card",
      currency: "UAH",
      balance: 20000,
      annualRatePct: 36,
      monthlyPayment: 1500,
    },
    { id: "friend", name: "Friend", icon: "🤝", kind: "loan", currency: "UAH", balance: 6000, monthlyPayment: 1000 },
  ],
};

describe("PayoffSheet", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("orders the debts and shows what an extra amount saves", async () => {
    const { user } = renderWithStore(<PayoffSheet onClose={vi.fn<() => void>()} />, { state });
    expect(screen.getAllByRole("listitem").map((row) => row.textContent)).toEqual([
      expect.stringContaining("Friend"),
      expect.stringContaining("Card"),
    ]);
    await user.type(screen.getByPlaceholderText("0"), "1000");
    expect(screen.getByText("less interest with the plan")).toBeInTheDocument();
  });
});
