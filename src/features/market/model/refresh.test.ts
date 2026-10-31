import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Investment, SavingsAccount } from "@/features/data/model/types";
import type { fetchInzhurQuotes } from "@/features/investments/api/inzhur";
import type { fetchCoinQuotes } from "@/features/market/api/coinGecko";
import type { fetchLiveRates } from "@/features/market/api/rates";

import {
  fetchPriceUpdate,
  fetchRatesUpdate,
  isStale,
  lastPricedAt,
  loadCoinQuotes,
  msUntilNextHour,
  pricedPositions,
} from "./refresh";

const coinQuotes = vi.hoisted(() => vi.fn<typeof fetchCoinQuotes>());
const fundQuotes = vi.hoisted(() => vi.fn<typeof fetchInzhurQuotes>());
const liveRates = vi.hoisted(() => vi.fn<typeof fetchLiveRates>());

vi.mock(import("@/features/market/api/coinGecko"), async (importOriginal) => ({
  ...(await importOriginal()),
  fetchCoinQuotes: coinQuotes,
}));
vi.mock(import("@/features/investments/api/inzhur"), async (importOriginal) => ({
  ...(await importOriginal()),
  fetchInzhurQuotes: fundQuotes,
}));
vi.mock(import("@/features/market/api/rates"), async (importOriginal) => ({
  ...(await importOriginal()),
  fetchLiveRates: liveRates,
}));

// Some coins or a fund held as an investment
const investment = (over: Partial<Investment> & Pick<Investment, "id" | "kind">): Investment => ({
  name: over.id,
  currency: "USD",
  principal: 100,
  annualRatePct: 0,
  quantity: 1,
  startDate: "2026-01-01",
  compounding: "reinvest",
  compoundingFreq: "monthly",
  ...over,
});

// A wallet with some coins
const wallet: SavingsAccount = {
  id: "wallet",
  name: "Wallet",
  icon: "🪙",
  kind: "crypto",
  currency: "USD",
  openingBalance: 0,
  holdings: [{ coin: "ethereum", quantity: 2 }],
};

const state: AppState = {
  ...DEFAULT_STATE,
  savings: [wallet],
  investments: [
    investment({ id: "btc", kind: "crypto", coin: "bitcoin", quantity: 0.5, pricedAt: "2026-10-01T10:00:00Z" }),
    investment({
      id: "fund",
      kind: "inzhur",
      fund: "rd4u",
      currency: "UAH",
      quantity: 10,
      pricedAt: "2026-10-02T10:00:00Z",
    }),
    investment({ id: "empty", kind: "crypto", coin: "bitcoin", quantity: 0 }),
  ],
};

describe("pricedPositions", () => {
  it("finds the coins and funds the app prices", () => {
    const { coinInvestments, inzhurInvestments, coinAccounts } = pricedPositions(state);
    expect(coinInvestments.map((item) => item.id)).toEqual(["btc"]);
    expect(inzhurInvestments.map((item) => item.id)).toEqual(["fund"]);
    expect(coinAccounts.map((item) => item.id)).toEqual(["wallet"]);
    expect(lastPricedAt(state)).toBe("2026-10-02T10:00:00Z");
    expect(lastPricedAt(DEFAULT_STATE)).toBeUndefined();
  });
});

describe("fetching", () => {
  beforeEach(() => {
    coinQuotes.mockReset().mockResolvedValue({ bitcoin: { price: 60000 }, ethereum: { price: 3000, icon: "e" } });
    fundQuotes.mockReset().mockResolvedValue({
      quotes: [{ id: "rd4u", name: "RD4U", navPerCertificate: 1100, projectedYieldPct: 12, income: "dividends" }],
      fetchedAt: "",
      partial: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("asks once per currency and tells a failed one", async () => {
    coinQuotes.mockRejectedValueOnce(new Error("down"));
    const { quotes, failed } = await loadCoinQuotes([
      { coin: "bitcoin", currency: "UAH" },
      { coin: "bitcoin", currency: "USD" },
      { coin: "ethereum", currency: "USD" },
    ]);
    expect(coinQuotes).toHaveBeenCalledTimes(2);
    expect(failed).toBe(true);
    expect([...quotes.keys()]).toEqual(["USD:bitcoin", "USD:ethereum"]);
  });

  it("writes the new prices into the investments and the wallet", async () => {
    const update = await fetchPriceUpdate(state);
    expect(update).toMatchObject({ changed: true, failed: [] });
    const priced = update.apply(state);
    expect(priced.investments[0]).toMatchObject({ marketValue: 30000 });
    expect(priced.investments[1]).toMatchObject({ marketValue: 11000, annualRatePct: 12 });
    expect(priced.savings[0]?.holdings?.[0]).toMatchObject({ price: 3000, icon: "e" });
  });

  it("names the source that failed and leaves the state when nothing came", async () => {
    coinQuotes.mockRejectedValue(new Error("down"));
    fundQuotes.mockRejectedValue(new Error("down"));
    const update = await fetchPriceUpdate(state);
    expect(update).toMatchObject({ changed: false, failed: ["crypto", "inzhur"] });
    expect(update.apply(state)).toBe(state);
  });

  it("stores today's rates with their source and time", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-17T10:00:00Z"), toFake: ["Date"] });
    liveRates.mockResolvedValue({ USD: { buy: 41, sell: 42 }, EUR: { buy: 48, sell: 49 }, source: "nbu" });
    const settings = (await fetchRatesUpdate())(state).settings;
    expect(settings).toMatchObject({
      rates: { USD: 41, EUR: 48 },
      ratesSource: "nbu",
      ratesUpdatedAt: "2026-10-17T10:00:00.000Z",
    });
  });
});

describe("timing", () => {
  it("counts to the next full hour and tells an hour-old moment", () => {
    const now = Date.parse("2026-10-17T10:45:00Z");
    expect(msUntilNextHour(now)).toBe(15 * 60_000);
    expect(isStale("2026-10-17T09:45:00Z", now)).toBe(true);
    expect(isStale("2026-10-17T10:00:00Z", now)).toBe(false);
    expect(isStale(undefined, now)).toBe(true);
    expect(isStale("never", now)).toBe(true);
  });
});
