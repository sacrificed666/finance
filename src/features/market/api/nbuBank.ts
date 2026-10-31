import "server-only";
import { averageRate } from "@/features/market/model/monthRates";
import { daysInMonth } from "@/shared/lib/date";
import { readNumber } from "@/shared/lib/guards";

export type NbuCurrency = "USD" | "EUR";

const NBU = "https://bank.gov.ua";
const TIMEOUT_MS = 10_000;

// The rates already read, by currency and day
const dayRates = new Map<string, number>();

// The averages of ended months already read
const monthRates = new Map<string, Record<NbuCurrency, number>>();

// Today in Kyiv, where the NBU sets its rates
export const kyivDay = (now = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(now)
    .slice(0, 10);

// This month in Kyiv
export const kyivMonth = (now = new Date()): string => kyivDay(now).slice(0, 7);

// The NBU average of a currency over a month, or null when it has none
const monthAverage = async (currency: NbuCurrency, month: string): Promise<number | null> => {
  const compact = month.replace("-", "");
  const from = `${compact}01`;
  const to = `${compact}${String(daysInMonth(month)).padStart(2, "0")}`;
  const res = await fetch(
    `${NBU}/NBU_Exchange/exchange_site?start=${from}&end=${to}&valcode=${currency.toLowerCase()}&sort=exchangedate&order=asc&json`,
    { signal: AbortSignal.timeout(TIMEOUT_MS) },
  );
  if (!res.ok) return null;
  const rows: unknown = await res.json();
  return averageRate(rows);
};

// The month's averages of both currencies, or null when the bank has not both
export const monthAverages = async (month: string): Promise<Record<NbuCurrency, number> | null> => {
  const known = monthRates.get(month);
  if (known) return known;
  const [usd, eur] = await Promise.all([monthAverage("USD", month), monthAverage("EUR", month)]);
  if (!usd || !eur) return null;
  const rates = { USD: usd, EUR: eur };
  monthRates.set(month, rates);
  return rates;
};

// The official rate of a currency on a day, or null when the bank has none
export const dayRate = async (currency: NbuCurrency, date: string): Promise<number | null> => {
  const key = `${currency}:${date}`;
  const known = dayRates.get(key);
  if (known) return known;
  const res = await fetch(
    `${NBU}/NBUStatService/v1/statdirectory/exchange?valcode=${currency}&date=${date.replaceAll("-", "")}&json`,
    { signal: AbortSignal.timeout(TIMEOUT_MS) },
  );
  const rows: unknown = await res.json();
  const rate = Array.isArray(rows) ? readNumber(rows[0], "rate") : null;
  if (!res.ok || rate === null || rate <= 0) return null;
  dayRates.set(key, rate);
  return rate;
};
