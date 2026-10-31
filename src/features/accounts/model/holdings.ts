import type { CoinHolding } from "@/features/data/model/types";
import type { CoinQuote } from "@/features/market/api/coinGecko";
import { formatNumber, type Currency } from "@/shared/lib/money";

import { coinInfo } from "./coins";

export interface HoldingDraft {
  key: string;
  coin: string;
  quantity: string;
  price?: number;
  icon?: string;
}

// The coins of an account as rows of the form
export const holdingDrafts = (holdings: CoinHolding[] | undefined, makeKey: () => string): HoldingDraft[] =>
  (holdings ?? []).map((holding) => ({
    key: makeKey(),
    coin: holding.coin,
    quantity: String(holding.quantity),
    price: holding.price,
    icon: holding.icon,
  }));

// The coins of an account in one line, such as "0.5 BTC · 2 ETH"
export const holdingsSummary = (holdings: CoinHolding[] | undefined): string =>
  (holdings ?? [])
    .map(
      (holding) =>
        `${formatNumber(holding.quantity, 8)} ${coinInfo(holding.coin)?.symbol ?? holding.coin.toUpperCase()}`,
    )
    .join(" · ");

// The form's coins with the fetched prices and pictures in a currency
export const pricedDrafts = (
  drafts: readonly HoldingDraft[],
  quotes: ReadonlyMap<string, CoinQuote>,
  currency: Currency,
): HoldingDraft[] =>
  drafts.map((draft) => {
    const quote = quotes.get(`${currency}:${draft.coin}`);
    return quote ? { ...draft, price: quote.price, icon: quote.icon ?? draft.icon } : draft;
  });
