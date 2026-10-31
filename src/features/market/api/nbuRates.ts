import type { MonthRates } from "@/features/market/model/monthRates";
import { readNumber } from "@/shared/lib/guards";

// The NBU averages of ended months, up to the first one the server lacks
export const fetchMonthRates = async (months: readonly string[], found: MonthRates = {}): Promise<MonthRates> => {
  const [month, ...rest] = months;
  if (month === undefined) return found;
  const response = await fetch(`/api/nbu-rate?month=${month}`).catch(() => null);
  if (!response?.ok) return found;
  const body: unknown = await response.json().catch(() => null);
  const usd = readNumber(body, "USD");
  const eur = readNumber(body, "EUR");
  const known = usd !== null && eur !== null && usd > 0 && eur > 0;
  return fetchMonthRates(rest, known ? { ...found, [month]: { USD: usd, EUR: eur } } : found);
};

// The official NBU rate of a currency on a day, or null when the bank has none
export const fetchDayRate = async (currency: string, date: string): Promise<number | null> => {
  const response = await fetch(`/api/nbu-rate?currency=${currency}&date=${date}`).catch(() => null);
  if (!response?.ok) return null;
  const body: unknown = await response.json().catch(() => null);
  return readNumber(body, "rate");
};
