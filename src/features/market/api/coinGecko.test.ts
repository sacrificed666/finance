import { afterEach, describe, expect, it, vi } from "vitest";

import { CoinGeckoError, fetchCoinQuotes } from "./coinGecko";

// A fetch that answers with this reply
const answer = (reply: Response) => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(reply);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("fetchCoinQuotes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prices the known coins and keeps only CoinGecko pictures", async () => {
    const fetchMock = answer(
      Response.json([
        { id: "bitcoin", current_price: 64000, image: "https://coin-images.coingecko.com/btc.png" },
        { id: "ethereum", current_price: 3100, image: "https://evil.example/eth.png" },
        { id: "dogecoin-fake", current_price: 1 },
        { id: "bitcoin-cash", current_price: 0 },
      ]),
    );
    await expect(fetchCoinQuotes(["bitcoin", "ethereum", "bitcoin"], "USD")).resolves.toEqual({
      bitcoin: { price: 64000, icon: "https://coin-images.coingecko.com/btc.png" },
      ethereum: { price: 3100, icon: undefined },
    });
    const [url] = fetchMock.mock.calls[0] ?? [];
    expect(url instanceof URL && url.searchParams.get("ids")).toBe("bitcoin,ethereum");
  });

  it("asks nothing for unknown coins", async () => {
    const fetchMock = answer(Response.json([]));
    await expect(fetchCoinQuotes(["nothing"], "UAH")).resolves.toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("tells a rate limit from another failure", async () => {
    answer(new Response(null, { status: 429 }));
    await expect(fetchCoinQuotes(["bitcoin"], "USD")).rejects.toEqual(new CoinGeckoError("limited"));
    answer(Response.json({ error: "down" }));
    await expect(fetchCoinQuotes(["bitcoin"], "USD")).rejects.toEqual(new CoinGeckoError("shape"));
  });
});
