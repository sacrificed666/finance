import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import type { fetchBankStatus, refreshBankStatus } from "@/features/import/api/bank";
import { renderWithStore } from "@/test/render";

import BankCheckCard from "./BankCheckCard";

const status = vi.hoisted(() => vi.fn<typeof fetchBankStatus>());
const refresh = vi.hoisted(() => vi.fn<typeof refreshBankStatus>());

vi.mock(import("@/features/import/api/bank"), async (importOriginal) => ({
  ...(await importOriginal()),
  fetchBankStatus: status,
  refreshBankStatus: refresh,
}));

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [{ id: "black", name: "Black", icon: "💳", kind: "card", currency: "UAH", openingBalance: 1000 }],
  settings: { ...DEFAULT_STATE.settings, bankLinks: { m1: "black" } },
};

// The bank's answer with a balance on the linked card
const answer = (balance: number) => ({
  connected: true,
  name: "",
  fetchedAt: null,
  webhook: false,
  accounts: [{ id: "m1", kind: "card" as const, currency: "UAH" as const, type: "black", maskedPan: "", balance }],
});

describe("BankCheckCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
    status.mockReset();
    refresh.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("offers to match a balance that differs from the bank", async () => {
    status.mockResolvedValue(answer(1250));
    const onMatch = vi.fn<(id: string, amount: number) => void>();
    const { user } = renderWithStore(<BankCheckCard onMatch={onMatch} />, { state });
    await user.click(await screen.findByRole("button", { name: "Match" }));
    expect(onMatch).toHaveBeenCalledWith("black", 1250);
    expect(screen.getByText("+250 ₴")).toBeInTheDocument();
  });

  it("names a card's credit limit beside its own money, which alone is checked", async () => {
    const credit = answer(1000);
    status.mockResolvedValue({
      ...credit,
      accounts: credit.accounts.map((a) => Object.assign({}, a, { creditLimit: 50_000 })),
    });
    renderWithStore(<BankCheckCard onMatch={vi.fn<(id: string, amount: number) => void>()} />, { state });
    expect(await screen.findByText(/credit limit 50K ₴ not counted$/u)).toBeInTheDocument();
    expect(screen.getByText("Matches")).toBeInTheDocument();
  });

  it("says when the bank asks to wait", async () => {
    status.mockResolvedValue(answer(1000));
    refresh.mockResolvedValue({ waitSeconds: "40" });
    const { user } = renderWithStore(<BankCheckCard onMatch={vi.fn<(id: string, amount: number) => void>()} />, {
      state,
    });
    expect(await screen.findByText("Matches")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Check now" }));
    await waitFor(() => expect(screen.getByText(/Try again in 40 s/u)).toBeInTheDocument());
  });

  it("stays away without a linked bank", () => {
    const { container } = renderWithStore(<BankCheckCard onMatch={vi.fn<(id: string, amount: number) => void>()} />);
    expect(container).toBeEmptyDOMElement();
    expect(status).not.toHaveBeenCalled();
  });
});
