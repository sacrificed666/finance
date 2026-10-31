import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchLiveRates, RatesError } from "./rates";

// A fetch that answers every request with the next of these replies
const answer = (...replies: Response[]) => {
  const fetchMock = vi.fn<typeof fetch>();
  for (const reply of replies) fetchMock.mockResolvedValueOnce(reply);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("fetchLiveRates", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("takes Monobank's buy and sell rates, or the cross rate", async () => {
    answer(
      Response.json([
        { currencyCodeA: 840, currencyCodeB: 980, rateBuy: 41.2, rateSell: 41.7 },
        { currencyCodeA: 978, currencyCodeB: 980, rateCross: 48.1 },
      ]),
    );
    await expect(fetchLiveRates()).resolves.toEqual({
      USD: { buy: 41.2, sell: 41.7 },
      EUR: { buy: 48.1, sell: 48.1 },
      source: "monobank",
    });
  });

  it("falls back to the NBU when Monobank is busy", async () => {
    const fetchMock = answer(
      new Response(null, { status: 429 }),
      Response.json([
        { cc: "USD", rate: 41.4 },
        { cc: "EUR", rate: 48.3 },
      ]),
    );
    await expect(fetchLiveRates()).resolves.toMatchObject({ USD: { buy: 41.4, sell: 41.4 }, source: "nbu" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails when neither bank has both rates", async () => {
    answer(Response.json([]), Response.json([{ cc: "USD", rate: 41.4 }]));
    await expect(fetchLiveRates()).rejects.toEqual(new RatesError("nbu", "shape"));
  });
});
