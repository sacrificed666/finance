import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, SavingsAccount } from "@/features/data/model/types";
import type { loadCoinQuotes } from "@/features/market/model/refresh";
import { chooseValue } from "@/test/choose";
import { renderWithStore } from "@/test/render";

import AccountSheet from "./AccountSheet";

const quotes = vi.hoisted(() => vi.fn<typeof loadCoinQuotes>());

vi.mock(import("@/features/market/model/refresh"), async (importOriginal) => ({
  ...(await importOriginal()),
  loadCoinQuotes: quotes,
}));

const black: SavingsAccount = {
  id: "black",
  name: "Black",
  icon: "💳",
  kind: "card",
  currency: "UAH",
  openingBalance: 100,
};

// The props of a sheet with spies for its callbacks
const props = () => ({
  onClose: vi.fn<() => void>(),
  onDelete: vi.fn<(id: string) => void>(),
  onReconcile: vi.fn<(id: string) => void>(),
  onPriceError: vi.fn<(message: string) => void>(),
});

const wallet: SavingsAccount = {
  id: "wallet",
  name: "Wallet",
  icon: "🔗",
  kind: "crypto",
  currency: "USD",
  openingBalance: 0,
  holdings: [{ coin: "bitcoin", quantity: 0.5, price: 50_000 }],
};

describe("AccountSheet", () => {
  beforeEach(() => {
    quotes.mockReset();
    vi.useFakeTimers({ toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds a card with a savings goal", async () => {
    const spies = props();
    const { user, probe } = renderWithStore(<AccountSheet target="new" {...spies} />);
    expect(screen.getByText("Name the account.")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("e.g. Monobank card"), "Black");
    await user.click(screen.getByRole("switch", { name: "Savings goal" }));
    await user.type(screen.getByRole("textbox", { name: /^Target amount/u }), "20000");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(spies.onClose).toHaveBeenCalledOnce());
    expect(probe.state.savings).toEqual([
      expect.objectContaining({ name: "Black", goal: { target: 20000, deadline: undefined } }),
    ]);
  });

  it("picks a card's emoji from its disc while no bank is set", async () => {
    const spies = props();
    const { user, probe } = renderWithStore(<AccountSheet target="new" {...spies} />);
    await user.type(screen.getByPlaceholderText("e.g. Monobank card"), "Pocket");
    expect(screen.queryByRole("button", { name: "Change" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Icon" }));
    await user.click(screen.getByRole("radio", { name: "🐷" }));
    expect(screen.queryByRole("radio", { name: "🐷" })).not.toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: /^Opening balance/u }), "10");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(spies.onClose).toHaveBeenCalledOnce());
    expect(probe.state.savings[0]).toMatchObject({ name: "Pocket", icon: "🐷" });
  });

  it("prices the coins of a crypto wallet before saving it", async () => {
    quotes.mockResolvedValue({ quotes: new Map([["USD:bitcoin", { price: 60000 }]]), failed: false });
    const spies = props();
    const { user, probe } = renderWithStore(<AccountSheet target="new" {...spies} />);
    await user.type(screen.getByPlaceholderText("e.g. Monobank card"), "Wallet");
    await chooseValue(user, screen.getByRole("combobox", { name: /^Kind/u }), "crypto");
    await user.type(screen.getByRole("textbox", { name: "Amount" }), "0.5");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(spies.onClose).toHaveBeenCalledOnce());
    expect(probe.state.savings[0]).toMatchObject({
      currency: "USD",
      holdings: [{ coin: "bitcoin", quantity: 0.5, price: 60000 }],
    });
  });

  it("offers to reconcile and delete a stored account", async () => {
    const spies = props();
    const state: AppState = { ...DEFAULT_STATE, savings: [black] };
    const { user } = renderWithStore(<AccountSheet target={black} {...spies} />, { state });
    await user.click(screen.getByRole("button", { name: "Reconcile" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(spies.onReconcile).toHaveBeenCalledWith("black");
    expect(spies.onDelete).toHaveBeenCalledWith("black");
  });

  it("loads coin prices on request and names a failure", async () => {
    quotes
      .mockResolvedValueOnce({ quotes: new Map(), failed: true })
      .mockResolvedValueOnce({ quotes: new Map(), failed: false })
      .mockResolvedValueOnce({ quotes: new Map([["USD:bitcoin", { price: 62_000 }]]), failed: false });
    const state: AppState = { ...DEFAULT_STATE, savings: [wallet] };
    const { user } = renderWithStore(<AccountSheet target={wallet} {...props()} />, { state });
    expect(screen.queryByRole("button", { name: "Reconcile" })).not.toBeInTheDocument();
    const load = screen.getByRole("button", { name: "Load prices" });
    await user.click(load);
    expect(await screen.findByText("Cryptocurrency prices are unavailable right now.")).toBeInTheDocument();
    vi.setSystemTime(Date.now() + 500);
    await user.click(load);
    expect(await screen.findByText("No prices came back.")).toBeInTheDocument();
    vi.setSystemTime(Date.now() + 500);
    await user.click(load);
    expect(await screen.findByText(/62,000/u)).toBeInTheDocument();
    expect(screen.queryByText("No prices came back.")).not.toBeInTheDocument();
  });

  it("prices the coins again in a new currency and reports a failure", async () => {
    quotes.mockResolvedValue({ quotes: new Map(), failed: true });
    const spies = props();
    const state: AppState = { ...DEFAULT_STATE, savings: [wallet] };
    const { user, probe } = renderWithStore(<AccountSheet target={wallet} {...spies} />, { state });
    await user.click(screen.getByRole("radio", { name: /EUR/u }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(spies.onClose).toHaveBeenCalledOnce());
    expect(quotes).toHaveBeenCalledWith([{ coin: "bitcoin", currency: "EUR" }]);
    expect(spies.onPriceError).toHaveBeenCalledWith("Cryptocurrency prices are unavailable right now.");
    expect(probe.state.savings[0]).toMatchObject({ currency: "EUR" });
  });

  it("adds a skins inventory of a custom game", async () => {
    const spies = props();
    const { user, probe } = renderWithStore(<AccountSheet target="new" {...spies} />);
    await user.type(screen.getByPlaceholderText("e.g. Monobank card"), "Stash");
    await chooseValue(user, screen.getByRole("combobox", { name: /^Kind/u }), "skins");
    expect(screen.queryByRole("button", { name: "Icon" })).not.toBeInTheDocument();
    await chooseValue(user, screen.getByRole("combobox", { name: /^Game/u }), "custom");
    await user.type(screen.getByPlaceholderText("e.g. Escape from Tarkov"), "Factorio");
    await user.type(screen.getByPlaceholderText("https://…"), "https://example.com/f.png");
    await user.click(screen.getByRole("button", { name: "Icon" }));
    await user.click(screen.getByRole("radio", { name: "🎮" }));
    await user.click(screen.getByRole("switch", { name: "Savings goal" }));
    await user.type(screen.getByRole("textbox", { name: /^Target amount/u }), "1000");
    await user.type(screen.getByLabelText(/Deadline/u), "2027-01-01");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(spies.onClose).toHaveBeenCalledOnce());
    expect(probe.state.savings[0]).toMatchObject({
      kind: "skins",
      game: "custom",
      gameName: "Factorio",
      gameLogo: "https://example.com/f.png",
      icon: "🎮",
      goal: { target: 1000, deadline: "2027-01-01" },
    });
  });
});
