import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchInzhurQuotes, InzhurError, parseQuote } from "./inzhur";

// A fetch that answers with this reply
const answer = (reply: Response) => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(reply);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const reit = {
  id: "inzhur-reit",
  name: "Inzhur REIT",
  navPerCertificate: 12.5,
  projectedYieldPct: 9.5,
  projectedCurrency: "USD",
  actualYieldPct: 10.2,
  income: "dividends",
};

describe("parseQuote", () => {
  it("reads a fund's quote and drops unknown currencies", () => {
    expect(parseQuote({ ...reit, actualYieldCurrency: "GBP" })).toEqual({
      ...reit,
      projectedYieldMaxPct: undefined,
      actualYieldCurrency: undefined,
    });
  });

  it("refuses a quote without a price or a known income", () => {
    expect(parseQuote({ ...reit, navPerCertificate: 0 })).toBeNull();
    expect(parseQuote({ ...reit, income: "coupons" })).toBeNull();
    expect(parseQuote("reit")).toBeNull();
  });
});

describe("fetchInzhurQuotes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("asks the app's server for the funds and keeps the good quotes", async () => {
    const fetchMock = answer(
      Response.json({ quotes: [reit, { id: "broken" }], fetchedAt: "2026-10-10T09:00:00.000Z", partial: true }),
    );
    const result = await fetchInzhurQuotes(["inzhur-reit", "inzhur-energy"]);
    expect(result.quotes.map((quote) => quote.id)).toEqual(["inzhur-reit"]);
    expect(result).toMatchObject({ fetchedAt: "2026-10-10T09:00:00.000Z", partial: true });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/inzhur?ids=inzhur-reit%2Cinzhur-energy");
  });

  it("throws with the status of a failed answer", async () => {
    answer(new Response("down", { status: 503 }));
    await expect(fetchInzhurQuotes()).rejects.toEqual(new InzhurError(503));
  });
});
