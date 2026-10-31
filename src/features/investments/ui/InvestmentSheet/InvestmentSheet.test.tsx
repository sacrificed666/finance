import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Investment } from "@/features/data/model/types";
import type { fetchInzhurQuotes } from "@/features/investments/api/inzhur";
import { chooseValue } from "@/test/choose";
import { renderWithStore } from "@/test/render";

import InvestmentSheet from "./InvestmentSheet";

const quotes = vi.hoisted(() => vi.fn<typeof fetchInzhurQuotes>());

vi.mock(import("@/features/investments/api/inzhur"), async (importOriginal) => ({
  ...(await importOriginal()),
  fetchInzhurQuotes: quotes,
}));

const ended: Investment = {
  id: "term",
  name: "Term deposit",
  kind: "deposit",
  currency: "UAH",
  principal: 10000,
  annualRatePct: 10,
  startDate: "2025-10-10",
  endDate: "2026-10-10",
  compounding: "payout",
  compoundingFreq: "monthly",
};

const reit: Investment = {
  id: "reit",
  name: "REIT",
  kind: "inzhur",
  fund: "inzhur-reit",
  currency: "UAH",
  principal: 1000,
  annualRatePct: 10,
  quantity: 100,
  startDate: "2026-01-01",
  compounding: "payout",
  compoundingFreq: "monthly",
};

// An answer with one fund's price
const priced = (id: string, nav: number) => ({
  quotes: [
    {
      id,
      name: id,
      navPerCertificate: nav,
      projectedYieldPct: 12,
      actualYieldPct: 11,
      actualYieldCurrency: "USD" as const,
      income: "dividends" as const,
    },
  ],
  fetchedAt: "2026-10-11T09:00:00.000Z",
  partial: false,
});

// The props of a sheet with spies for its callbacks
const props = () => ({ onClose: vi.fn<() => void>(), onDelete: vi.fn<(id: string) => void>() });

describe("InvestmentSheet", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-11T12:00:00"), toFake: ["Date"] });
    quotes.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds a deposit that compounds monthly", async () => {
    const spies = props();
    const { user, probe } = renderWithStore(<InvestmentSheet target="new" {...spies} />);
    expect(screen.getByText("Name the investment.")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("e.g. Government bonds"), "Savings");
    await user.type(screen.getByRole("textbox", { name: /^(Principal|What you paid)/u }), "20000");
    await user.type(screen.getByPlaceholderText("e.g. 15.3"), "12");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(spies.onClose).toHaveBeenCalledOnce();
    expect(probe.state.investments).toEqual([
      expect.objectContaining({
        name: "Savings",
        kind: "deposit",
        principal: 20000,
        annualRatePct: 12,
        startDate: "2026-10-11",
        compounding: "reinvest",
        compoundingFreq: "monthly",
      }),
    ]);
  });

  it("prices certificates of an Inzhur fund and keeps their value", async () => {
    quotes.mockResolvedValue({
      quotes: [
        { id: "inzhur-reit", name: "Inzhur REIT", navPerCertificate: 12.5, projectedYieldPct: 10, income: "dividends" },
      ],
      fetchedAt: "2026-10-11T09:00:00.000Z",
      partial: false,
    });
    const spies = props();
    const { user, probe } = renderWithStore(<InvestmentSheet target="new" {...spies} />);
    await chooseValue(user, screen.getByRole("combobox", { name: /^Type/u }), "inzhur");
    expect(await screen.findByText("NAV per certificate: 12.50 ₴")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Inzhur REIT")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("e.g. 1000"), "100");
    expect(screen.getByText("100 certificates ≈ 1,250.00 ₴")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: /^(Principal|What you paid)/u }), "1000");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.investments[0]).toMatchObject({
      kind: "inzhur",
      fund: "inzhur-reit",
      quantity: 100,
      marketValue: 1250,
      annualRatePct: 10,
      pricedAt: "2026-10-11T09:00:00.000Z",
    });
  });

  it("says when Inzhur does not answer", async () => {
    quotes.mockRejectedValue(new Error("offline"));
    const { user } = renderWithStore(<InvestmentSheet target="new" {...props()} />);
    await chooseValue(user, screen.getByRole("combobox", { name: /^Type/u }), "inzhur");
    expect(await screen.findByText("Inzhur prices are unavailable right now.")).toBeInTheDocument();
  });

  it("renews an ended term from what it came to", async () => {
    const spies = props();
    const state: AppState = { ...DEFAULT_STATE, investments: [ended] };
    const { user, probe } = renderWithStore(<InvestmentSheet target={ended} renew {...spies} />, { state });
    expect(screen.getByRole("dialog", { name: "Reinvest for another term" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete investment" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(spies.onClose).toHaveBeenCalledOnce());
    expect(probe.state.investments).toEqual([
      expect.objectContaining({ id: "term", principal: 10000, startDate: "2026-10-10", endDate: "2027-10-10" }),
    ]);
  });

  it("offers to delete a stored position", async () => {
    const spies = props();
    const state: AppState = { ...DEFAULT_STATE, investments: [ended] };
    const { user } = renderWithStore(<InvestmentSheet target={ended} {...spies} />, { state });
    await user.click(screen.getByRole("button", { name: "Delete investment" }));
    expect(spies.onDelete).toHaveBeenCalledWith("term");
  });

  it("prices a stored fund on opening and another one on request", async () => {
    quotes.mockResolvedValueOnce({ quotes: [], fetchedAt: "2026-10-11T09:00:00.000Z", partial: true });
    const state: AppState = { ...DEFAULT_STATE, investments: [reit] };
    const { user } = renderWithStore(<InvestmentSheet target={reit} {...props()} />, { state });
    expect(screen.getByRole("dialog", { name: "Edit investment" })).toBeInTheDocument();
    expect(await screen.findByText("This fund did not return a price.")).toBeInTheDocument();
    quotes.mockResolvedValueOnce(priced("inzhur-energy", 9));
    await chooseValue(user, screen.getByRole("combobox", { name: /^Inzhur fund/u }), "inzhur-energy");
    expect(await screen.findByText("NAV per certificate: 9.00 ₴")).toBeInTheDocument();
    expect(screen.getByText(/11%/u)).toBeInTheDocument();
    quotes.mockRejectedValueOnce(new Error("offline"));
    vi.setSystemTime(Date.now() + 500);
    await user.click(screen.getByRole("button", { name: "Load NAV" }));
    expect(await screen.findByText("Inzhur prices are unavailable right now.")).toBeInTheDocument();
  });

  it("ignores a price that comes after the sheet closed", async () => {
    const late = Promise.withResolvers<ReturnType<typeof priced>>();
    quotes.mockReturnValueOnce(late.promise);
    const state: AppState = { ...DEFAULT_STATE, investments: [reit] };
    const view = renderWithStore(<InvestmentSheet target={reit} {...props()} />, { state });
    view.unmount();
    late.resolve(priced("inzhur-reit", 12));
    await expect(late.promise).resolves.toBeDefined();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("adds a coin position and a stock with its worth today", async () => {
    const spies = props();
    const { user, probe } = renderWithStore(<InvestmentSheet target="new" {...spies} />);
    await chooseValue(user, screen.getByRole("combobox", { name: /^Type/u }), "crypto");
    await user.type(screen.getByPlaceholderText("e.g. Cold wallet"), "Coins");
    await chooseValue(user, screen.getByRole("combobox", { name: /^Coin/u }), "ethereum");
    await user.type(screen.getByPlaceholderText("e.g. 0.25"), "2");
    await user.click(screen.getByRole("radio", { name: /USD/u }));
    await user.type(screen.getByRole("textbox", { name: /^(Principal|What you paid)/u }), "5000");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.investments[0]).toMatchObject({
      kind: "crypto",
      coin: "ethereum",
      quantity: 2,
      currency: "USD",
    });
  });

  it("asks how a REIT pays its dividends and when it was sold", async () => {
    const spies = props();
    const { user, probe } = renderWithStore(<InvestmentSheet target="new" {...spies} />);
    await chooseValue(user, screen.getByRole("combobox", { name: /^Type/u }), "reit");
    await user.type(screen.getByPlaceholderText("e.g. Government bonds"), "Property fund");
    await user.type(screen.getByRole("textbox", { name: /^(Principal|What you paid)/u }), "1000");
    await user.type(screen.getByLabelText(/^Worth today/u), "1200");
    await user.click(screen.getByRole("radio", { name: "Reinvested" }));
    await user.type(screen.getByLabelText(/^Held until/u), "2027-01-01");
    await user.type(screen.getByLabelText(/^Monthly top-up/u), "100");
    await user.type(screen.getByLabelText(/^Note/u), "Long term");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.investments[0]).toMatchObject({
      kind: "reit",
      marketValue: 1200,
      compounding: "reinvest",
      endDate: "2027-01-01",
      monthlyContribution: 100,
      note: "Long term",
    });
  });

  it("lets a deposit compound quarterly", async () => {
    const { user, probe } = renderWithStore(<InvestmentSheet target="new" {...props()} />);
    await user.type(screen.getByPlaceholderText("e.g. Government bonds"), "Deposit");
    await user.type(screen.getByRole("textbox", { name: /^(Principal|What you paid)/u }), "1000");
    await user.type(screen.getByPlaceholderText("e.g. 15.3"), "10");
    await chooseValue(user, screen.getByRole("combobox", { name: /^Compounding frequency/u }), "quarterly");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.investments[0]).toMatchObject({ compoundingFreq: "quarterly" });
  });
});
