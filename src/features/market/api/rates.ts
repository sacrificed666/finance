import { readNumber, readString } from "@/shared/lib/guards";

export interface BuySell {
  buy: number;
  sell: number;
}

export interface FetchedRates {
  USD: BuySell;
  EUR: BuySell;
  source: "monobank" | "nbu";
}

const MONOBANK_URL = "https://api.monobank.ua/bank/currency";
const NBU_URL = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json";

// The ISO 4217 numbers Monobank names currencies by
const ISO = { USD: 840, EUR: 978, UAH: 980 } as const;

// Why a bank gave no rates
export class RatesError extends Error {
  readonly bank: FetchedRates["source"];
  readonly reason: "limited" | "status" | "shape";

  // Keeps the bank and the reason
  constructor(bank: FetchedRates["source"], reason: "limited" | "status" | "shape") {
    super(`${bank}: ${reason}`);
    this.name = "RatesError";
    this.bank = bank;
    this.reason = reason;
  }
}

// The buy and sell rates of a Monobank row, or its cross rate for both
const monoPair = (row: unknown): BuySell | null => {
  const buy = readNumber(row, "rateBuy");
  const sell = readNumber(row, "rateSell");
  if (buy && sell) return { buy, sell };
  const cross = readNumber(row, "rateCross");
  return cross ? { buy: cross, sell: cross } : null;
};

// Monobank's card rates; it answers one request in five minutes
const fetchMonobank = async (): Promise<FetchedRates> => {
  const response = await fetch(MONOBANK_URL, { cache: "no-store" });
  if (response.status === 429) throw new RatesError("monobank", "limited");
  if (!response.ok) throw new RatesError("monobank", "status");
  const body: unknown = await response.json();
  if (!Array.isArray(body)) throw new RatesError("monobank", "shape");
  // The row of a currency against the hryvnia
  const rowOf = (code: number): unknown =>
    body.find((row) => readNumber(row, "currencyCodeA") === code && readNumber(row, "currencyCodeB") === ISO.UAH);
  const usd = monoPair(rowOf(ISO.USD));
  const eur = monoPair(rowOf(ISO.EUR));
  if (!usd || !eur) throw new RatesError("monobank", "shape");
  return { USD: usd, EUR: eur, source: "monobank" };
};

// The NBU's official rates, the same for buying and selling
const fetchNbu = async (): Promise<FetchedRates> => {
  const response = await fetch(NBU_URL, { cache: "no-store" });
  if (!response.ok) throw new RatesError("nbu", "status");
  const body: unknown = await response.json();
  if (!Array.isArray(body)) throw new RatesError("nbu", "shape");
  // The rate of a currency by its letter code
  const rateOf = (code: string) =>
    readNumber(
      body.find((row) => readString(row, "cc") === code),
      "rate",
    );
  const usd = rateOf("USD");
  const eur = rateOf("EUR");
  if (usd === null || eur === null) throw new RatesError("nbu", "shape");
  return { USD: { buy: usd, sell: usd }, EUR: { buy: eur, sell: eur }, source: "nbu" };
};

// Today's rates from Monobank, or from the NBU when Monobank does not answer
export const fetchLiveRates = async (): Promise<FetchedRates> => {
  try {
    return await fetchMonobank();
  } catch {
    return await fetchNbu();
  }
};
