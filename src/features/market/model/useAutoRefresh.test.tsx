import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Transaction } from "@/features/data/model/types";
import type { fetchMonthRates as FetchMonthRates } from "@/features/market/api/nbuRates";
import type { fetchRatesUpdate as FetchRatesUpdate } from "@/features/market/model/refresh";
import { renderWithStore } from "@/test/render";

import { useAutoRefresh } from "./useAutoRefresh";

const fetchRatesUpdate = vi.hoisted(() => vi.fn<typeof FetchRatesUpdate>());
const fetchMonthRates = vi.hoisted(() => vi.fn<typeof FetchMonthRates>());

vi.mock(import("@/features/market/model/refresh"), async (importOriginal) => ({
  ...(await importOriginal()),
  fetchRatesUpdate,
}));
vi.mock(import("@/features/market/api/nbuRates"), async (importOriginal) => ({
  ...(await importOriginal()),
  fetchMonthRates,
}));

const NOW = new Date("2026-10-17T10:20:00");

// The hook inside the test store
const Refresher = () => {
  useAutoRefresh();
  return null;
};

// The default data with rates fetched at a moment
const ratedAt = (at: Date): AppState => ({
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_STATE.settings, ratesUpdatedAt: at.toISOString() },
});

// A dollar expense on a day
const dollars = (date: string): Transaction => ({
  id: date,
  type: "expense",
  amount: 10,
  currency: "USD",
  categoryId: "cat-food",
  date,
});

describe("useAutoRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ["setTimeout", "setInterval", "clearTimeout", "clearInterval", "Date"] });
    localStorage.clear();
    fetchRatesUpdate
      .mockReset()
      .mockResolvedValue((state) => ({ ...state, settings: { ...state.settings, ratesSource: "nbu" } }));
    fetchMonthRates.mockReset().mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refreshes stale rates shortly after the data loads", async () => {
    const { probe } = renderWithStore(<Refresher />);
    await act(() => vi.advanceTimersByTimeAsync(1_999));
    expect(fetchRatesUpdate).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(fetchRatesUpdate).toHaveBeenCalledOnce();
    expect(probe.state.settings.ratesSource).toBe("nbu");
    // A background refresh never takes the undo of a person's last change
    expect(probe.undoLabels).toEqual([]);
  });

  it("leaves fresh rates alone until the next hour", async () => {
    renderWithStore(<Refresher />, { state: ratedAt(new Date("2026-10-17T10:00:00")) });
    await act(() => vi.advanceTimersByTimeAsync(2_000));
    expect(fetchRatesUpdate).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(40 * 60_000));
    expect(fetchRatesUpdate).toHaveBeenCalledOnce();
  });

  it("leaves the hourly refresh to a tab in view", async () => {
    const hidden = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    renderWithStore(<Refresher />, { state: ratedAt(new Date("2026-10-17T10:00:00")) });
    await act(() => vi.advanceTimersByTimeAsync(40 * 60_000));
    expect(fetchRatesUpdate).not.toHaveBeenCalled();
    hidden.mockRestore();
  });

  it("skips an hour another tab has already refreshed", async () => {
    localStorage.setItem("finance-tracker:refreshed-hour", "2026-9-17-10");
    renderWithStore(<Refresher />);
    await act(() => vi.advanceTimersByTimeAsync(2_000));
    expect(fetchRatesUpdate).not.toHaveBeenCalled();
  });

  it("fills in the rates of the ended months", async () => {
    fetchMonthRates.mockResolvedValue({ "2026-09": { USD: 41.3, EUR: 48.1 } });
    const state = { ...ratedAt(NOW), transactions: [dollars("2026-09-12"), dollars("2026-10-02")] };
    const { probe } = renderWithStore(<Refresher />, { state });
    await act(() => vi.advanceTimersByTimeAsync(2_000));
    expect(fetchMonthRates).toHaveBeenCalledWith(["2026-09"]);
    expect(probe.state.settings.monthRates).toEqual({ "2026-09": { USD: 41.3, EUR: 48.1 } });
  });
});
