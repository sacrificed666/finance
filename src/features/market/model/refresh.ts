import type { AppState, Investment } from "@/features/data/model/types";
import { fetchInzhurQuotes, type InzhurQuote } from "@/features/investments/api/inzhur";
import { fetchCoinQuotes, type CoinQuote } from "@/features/market/api/coinGecko";
import { fetchLiveRates } from "@/features/market/api/rates";
import { convert, type Currency } from "@/shared/lib/money";

export const HOUR_MS = 60 * 60 * 1000;

export type PriceSource = "crypto" | "inzhur";

interface CoinWanted {
  coin: string;
  currency: Currency;
}

// The coin accounts and the coin and fund investments whose prices are fetched
export const pricedPositions = (state: AppState) => ({
  coinInvestments: state.investments.filter((item) => item.kind === "crypto" && item.coin && (item.quantity ?? 0) > 0),
  inzhurInvestments: state.investments.filter(
    (item) => item.kind === "inzhur" && item.fund && (item.quantity ?? 0) > 0,
  ),
  coinAccounts: state.savings.filter((account) => account.kind === "crypto" && (account.holdings?.length ?? 0) > 0),
});

// When the newest price of a priced position was fetched
export const lastPricedAt = (state: AppState): string | undefined => {
  const { coinInvestments, inzhurInvestments, coinAccounts } = pricedPositions(state);
  return [...coinInvestments, ...inzhurInvestments, ...coinAccounts]
    .flatMap((item) => (item.pricedAt ? [item.pricedAt] : []))
    .toSorted()
    .at(-1);
};

// Coin prices keyed "currency:coin", and whether a request failed
export const loadCoinQuotes = async (wanted: readonly CoinWanted[]) => {
  const byCurrency = new Map<Currency, string[]>();
  for (const { coin, currency } of wanted) byCurrency.set(currency, [...(byCurrency.get(currency) ?? []), coin]);
  const results = await Promise.allSettled(
    [...byCurrency].map(async ([currency, ids]) => ({ currency, quotes: await fetchCoinQuotes(ids, currency) })),
  );
  const quotes = new Map<string, CoinQuote>();
  let failed = false;
  for (const result of results) {
    if (result.status === "rejected") failed = true;
    else
      for (const [id, quote] of Object.entries(result.value.quotes))
        quotes.set(`${result.value.currency}:${id}`, quote);
  }
  return { quotes, failed };
};

// Fund prices by fund, and whether Inzhur failed to answer
const loadFundQuotes = async (ids: readonly string[]) => {
  const quotes = new Map<string, InzhurQuote>();
  if (ids.length === 0) return { quotes, failed: false };
  try {
    const answer = await fetchInzhurQuotes([...new Set(ids)]);
    for (const quote of answer.quotes) quotes.set(quote.id, quote);
    return { quotes, failed: false };
  } catch {
    return { quotes, failed: true };
  }
};

// An investment with its new coin or fund price
const pricedInvestment = (
  state: AppState,
  item: Investment,
  coins: ReadonlyMap<string, CoinQuote>,
  funds: ReadonlyMap<string, InzhurQuote>,
  pricedAt: string,
): Investment => {
  if (item.kind === "crypto" && item.coin) {
    const quote = coins.get(`${item.currency}:${item.coin}`);
    if (!quote) return item;
    const marketValue = (item.quantity ?? 0) * quote.price;
    return { ...item, marketValue, coinIcon: quote.icon ?? item.coinIcon, pricedAt };
  }
  if (item.kind === "inzhur" && item.fund) {
    const quote = funds.get(item.fund);
    if (!quote) return item;
    const perUnit = convert(quote.navPerCertificate, "UAH", item.currency, state.settings.rates);
    return { ...item, marketValue: (item.quantity ?? 0) * perUnit, annualRatePct: quote.projectedYieldPct, pricedAt };
  }
  return item;
};

// The state with the new prices of coins and funds
const applyQuotes = (
  state: AppState,
  coins: ReadonlyMap<string, CoinQuote>,
  funds: ReadonlyMap<string, InzhurQuote>,
  pricedAt: string,
): AppState => ({
  ...state,
  savings: state.savings.map((account) => {
    if (account.kind !== "crypto" || !account.holdings?.length) return account;
    const holdings = account.holdings.map((holding) => {
      const quote = coins.get(`${account.currency}:${holding.coin}`);
      return quote ? { ...holding, price: quote.price, icon: quote.icon ?? holding.icon } : holding;
    });
    const touched = holdings.some((holding, index) => holding !== account.holdings?.[index]);
    return touched ? { ...account, holdings, pricedAt } : account;
  }),
  investments: state.investments.map((item) => pricedInvestment(state, item, coins, funds, pricedAt)),
});

// Fetches the prices of every priced position; apply writes them into a state
export const fetchPriceUpdate = async (state: AppState) => {
  const { coinInvestments, inzhurInvestments, coinAccounts } = pricedPositions(state);
  const wanted: CoinWanted[] = [
    ...coinInvestments.flatMap((item) => (item.coin ? [{ coin: item.coin, currency: item.currency }] : [])),
    ...coinAccounts.flatMap((account) =>
      (account.holdings ?? []).map((holding) => ({ coin: holding.coin, currency: account.currency })),
    ),
  ];
  const funds = inzhurInvestments.flatMap((item) => (item.fund ? [item.fund] : []));
  const [coinAnswer, fundAnswer] = await Promise.all([loadCoinQuotes(wanted), loadFundQuotes(funds)]);
  const failed: PriceSource[] = [];
  if (coinAnswer.failed) failed.push("crypto");
  if (fundAnswer.failed) failed.push("inzhur");
  const changed = coinAnswer.quotes.size > 0 || fundAnswer.quotes.size > 0;
  const pricedAt = new Date().toISOString();
  return {
    changed,
    failed,
    // Writes the prices into a state, or leaves it when nothing came back
    apply: (next: AppState) => (changed ? applyQuotes(next, coinAnswer.quotes, fundAnswer.quotes, pricedAt) : next),
  };
};

// Fetches today's rates; the result writes them into a state
export const fetchRatesUpdate = async (): Promise<(state: AppState) => AppState> => {
  const fetched = await fetchLiveRates();
  const updatedAt = new Date().toISOString();
  return (state) => ({
    ...state,
    settings: {
      ...state.settings,
      rates: { USD: fetched.USD.buy, EUR: fetched.EUR.buy },
      ratesMeta: { USD: fetched.USD, EUR: fetched.EUR },
      ratesSource: fetched.source,
      ratesUpdatedAt: updatedAt,
    },
  });
};

// The milliseconds left until the next full hour
export const msUntilNextHour = (now = Date.now()): number => {
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  return next.getTime() + HOUR_MS - now;
};

// Whether a moment is missing or an hour old
export const isStale = (iso: string | undefined, now = Date.now()): boolean => {
  if (!iso) return true;
  const at = Date.parse(iso);
  return !Number.isFinite(at) || now - at >= HOUR_MS;
};
