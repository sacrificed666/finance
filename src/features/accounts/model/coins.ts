import type { CoinHolding } from "@/features/data/model/types";

export interface Coin {
  id: string;
  symbol: string;
  name: string;
}

// The coins a cryptocurrency account or position can hold, by CoinGecko id
export const COINS: Coin[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "tether", symbol: "USDT", name: "Tether" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "usd-coin", symbol: "USDC", name: "USD Coin" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
  { id: "tron", symbol: "TRX", name: "TRON" },
  { id: "whitebit", symbol: "WBT", name: "WhiteBIT Coin" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink" },
  { id: "stellar", symbol: "XLM", name: "Stellar" },
  { id: "bitcoin-cash", symbol: "BCH", name: "Bitcoin Cash" },
  { id: "litecoin", symbol: "LTC", name: "Litecoin" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche" },
  { id: "the-open-network", symbol: "TON", name: "Toncoin (Gram)" },
  { id: "sui", symbol: "SUI", name: "Sui" },
  { id: "near", symbol: "NEAR", name: "NEAR Protocol" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot" },
  { id: "shiba-inu", symbol: "SHIB", name: "Shiba Inu" },
  { id: "pepe", symbol: "PEPE", name: "Pepe" },
  { id: "polygon-ecosystem-token", symbol: "POL", name: "Polygon (POL)" },
  { id: "dai", symbol: "DAI", name: "Dai" },
];

const COIN_BY_ID = new Map(COINS.map((coin) => [coin.id, coin]));

// What the priced coins of an account are worth together
export const holdingsValue = (holdings: CoinHolding[] | undefined): number => {
  if (!holdings) return 0;
  let sum = 0;
  for (const holding of holdings) if (holding.price && holding.quantity > 0) sum += holding.quantity * holding.price;
  return sum;
};

// A supported coin by its id
export const coinInfo = (id: string | undefined): Coin | undefined => (id ? COIN_BY_ID.get(id) : undefined);

// Whether CoinGecko can price a coin of this id
export const isKnownCoin = (id: string): boolean => COIN_BY_ID.has(id);
