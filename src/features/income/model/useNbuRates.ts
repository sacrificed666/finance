"use client";

import { useEffect, useState } from "react";

import { fetchDayRate } from "@/features/market/api/nbuRates";

// The official NBU rates of some "currency:date" keys, as they arrive
export const useNbuRates = (keys: readonly string[]): ReadonlyMap<string, number> => {
  const [rates, setRates] = useState<ReadonlyMap<string, number>>(new Map());
  const wanted = keys.join(",");

  // Asks for every rate at once and keeps the ones the bank had
  useEffect(() => {
    let alive = true;
    const asked = wanted.split(",").filter(Boolean);
    void Promise.all(
      asked.map(async (key) => {
        const [currency = "", date = ""] = key.split(":");
        return [key, await fetchDayRate(currency, date)] as const;
      }),
    ).then((answers) => {
      const found = new Map(answers.flatMap(([key, rate]) => (rate ? [[key, rate] as const] : [])));
      if (alive && found.size > 0) setRates(found);
    });
    return () => {
      alive = false;
    };
  }, [wanted]);

  return rates;
};
