import { isKnownCoin } from "@/features/accounts/model/coins";
import { readNumber, readString } from "@/shared/lib/guards";
import type { Currency } from "@/shared/lib/money";

const MARKETS_URL = "https://api.coingecko.com/api/v3/coins/markets";
// Coin pictures are taken only from CoinGecko's own hosts
const ICON_HOST = /^https:\/\/[\w.-]*coingecko\.com\//u;

export interface CoinQuote {
  price: number;
  icon?: string;
}

export type CoinQuotes = Record<string, CoinQuote>;

// Why CoinGecko could not price the coins
export class CoinGeckoError extends Error {
  readonly reason: "limited" | "status" | "shape";

  // Keeps the reason
  constructor(reason: "limited" | "status" | "shape") {
    super(`CoinGecko: ${reason}`);
    this.name = "CoinGeckoError";
    this.reason = reason;
  }
}

// The current price and picture of each supported coin in a currency
export const fetchCoinQuotes = async (ids: readonly string[], currency: Currency): Promise<CoinQuotes> => {
  const wanted = [...new Set(ids)].filter(isKnownCoin);
  if (wanted.length === 0) return {};
  const url = new URL(MARKETS_URL);
  url.searchParams.set("vs_currency", currency.toLowerCase());
  url.searchParams.set("ids", wanted.join(","));
  url.searchParams.set("per_page", String(wanted.length));
  url.searchParams.set("sparkline", "false");
  url.searchParams.set("price_change_percentage", "");
  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 429) throw new CoinGeckoError("limited");
  if (!response.ok) throw new CoinGeckoError("status");
  const body: unknown = await response.json();
  if (!Array.isArray(body)) throw new CoinGeckoError("shape");
  const quotes: CoinQuotes = {};
  for (const row of body) {
    const id = readString(row, "id");
    const price = readNumber(row, "current_price");
    if (!id || !isKnownCoin(id) || price === null || price <= 0) continue;
    const image = readString(row, "image");
    quotes[id] = { price, icon: image && ICON_HOST.test(image) ? image : undefined };
  }
  return quotes;
};
