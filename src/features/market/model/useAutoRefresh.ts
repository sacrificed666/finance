"use client";

import { useEffect, useEffectEvent, useRef } from "react";

import { useStore } from "@/app/hooks";
import type { AppState } from "@/features/data/model/types";
import { fetchMonthRates } from "@/features/market/api/nbuRates";
import { monthsNeedingRates } from "@/features/market/model/monthRates";
import {
  fetchPriceUpdate,
  fetchRatesUpdate,
  HOUR_MS,
  isStale,
  lastPricedAt,
  msUntilNextHour,
  pricedPositions,
} from "@/features/market/model/refresh";
import { currentMonth } from "@/shared/lib/date";

const CLAIM_KEY = "finance-tracker:refreshed-hour";

// The hour of a moment in the browser's time, the same in every tab
const hourKey = (now = new Date()) => `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;

// Whether this tab refreshes first in this hour, so the other tabs skip it
const claimThisHour = (): boolean => {
  const key = hourKey();
  try {
    if (localStorage.getItem(CLAIM_KEY) === key) return false;
    localStorage.setItem(CLAIM_KEY, key);
  } catch {
    return true;
  }
  return true;
};

// Whether the account holds coins or funds whose prices the app fetches
const hasPriced = (state: AppState) => {
  const { coinAccounts, coinInvestments, inzhurInvestments } = pricedPositions(state);
  return coinAccounts.length + coinInvestments.length + inzhurInvestments.length > 0;
};

// Whether the rates, or the prices of anything priced, are an hour old
const isOutdated = (state: AppState) =>
  isStale(state.settings.ratesUpdatedAt) || (hasPriced(state) && isStale(lastPricedAt(state)));

// Refreshes the rates and prices on the hour and when a stale tab comes back
export const useAutoRefresh = () => {
  const { state, quietUpdate, hydrated } = useStore();
  const busy = useRef(false);
  const fillingRates = useRef(false);

  // Fills in the average rates of the ended months that have none yet
  const fillMonthRates = useEffectEvent(async () => {
    const missing = monthsNeedingRates(state, currentMonth());
    if (missing.length === 0 || fillingRates.current) return;
    fillingRates.current = true;
    try {
      const found = await fetchMonthRates(missing);
      if (Object.keys(found).length === 0) return;
      quietUpdate((s) => ({ ...s, settings: { ...s.settings, monthRates: { ...s.settings.monthRates, ...found } } }));
    } finally {
      fillingRates.current = false;
    }
  });

  // Fetches the rates and the prices, one run at a time, and applies the news
  const run = useEffectEvent(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const [rates, prices] = await Promise.all([
        fetchRatesUpdate().catch(() => null),
        hasPriced(state) ? fetchPriceUpdate(state).catch(() => null) : null,
      ]);
      if (!rates && !prices?.changed) return;
      // The new rates first, so the fund prices convert at them; a person's undo stays
      quietUpdate((s) => {
        const rated = rates ? rates(s) : s;
        return prices?.changed ? prices.apply(rated) : rated;
      });
    } finally {
      busy.current = false;
    }
  });

  // Whether the data this tab shows is an hour old
  const outdated = useEffectEvent(() => isOutdated(state));

  // Starts shortly after the data loads, then runs on every hour
  useEffect(() => {
    if (!hydrated) return;
    // Refreshes when the rates or the prices are an hour old
    const refreshIfStale = () => {
      if (outdated() && claimThisHour()) void run();
    };
    // Refreshes on the hour in a tab in view, unless another tab already has
    const onTheHour = () => {
      if (document.visibilityState === "visible" && claimThisHour()) void run();
    };
    // A tab coming back after a while checks its data
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshIfStale();
    };

    const first = setTimeout(() => {
      refreshIfStale();
      void fillMonthRates();
    }, 2_000);
    let interval: ReturnType<typeof setInterval> | undefined;
    const hourly = setTimeout(() => {
      onTheHour();
      interval = setInterval(onTheHour, HOUR_MS);
    }, msUntilNextHour());
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearTimeout(hourly);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hydrated]);
};
