import type { InzhurIncome } from "@/features/investments/model/inzhur";
import { isRecord, readArray, readNumber, readString } from "@/shared/lib/guards";

export type YieldCurrency = "USD" | "UAH";

export interface InzhurQuote {
  id: string;
  name: string;
  navPerCertificate: number;
  projectedYieldPct: number;
  projectedYieldMaxPct?: number;
  projectedCurrency?: YieldCurrency;
  actualYieldPct?: number;
  actualYieldCurrency?: YieldCurrency;
  income: InzhurIncome;
}

export interface InzhurQuotesResponse {
  quotes: InzhurQuote[];
  fetchedAt: string;
  partial: boolean;
}

// The app could not read the fund pages, for the message under the prices
export class InzhurError extends Error {
  readonly status: number;

  // Keeps the status for the message the user sees
  constructor(status: number) {
    super(`Inzhur: ${String(status)}`);
    this.name = "InzhurError";
    this.status = status;
  }
}

// The currency a yield is counted in, when it is one of the two
const yieldCurrency = (source: unknown, key: string): YieldCurrency | undefined => {
  const value = readString(source, key);
  return value === "USD" || value === "UAH" ? value : undefined;
};

// A fund's quote from the server's answer, or null when it is not one
export const parseQuote = (row: unknown): InzhurQuote | null => {
  const id = readString(row, "id");
  const name = readString(row, "name");
  const nav = readNumber(row, "navPerCertificate");
  const projected = readNumber(row, "projectedYieldPct");
  const income = readString(row, "income");
  if (!id || !name || nav === null || nav <= 0 || projected === null) return null;
  if (income !== "dividends" && income !== "growth") return null;
  return {
    id,
    name,
    navPerCertificate: nav,
    projectedYieldPct: projected,
    projectedYieldMaxPct: readNumber(row, "projectedYieldMaxPct") ?? undefined,
    projectedCurrency: yieldCurrency(row, "projectedCurrency"),
    actualYieldPct: readNumber(row, "actualYieldPct") ?? undefined,
    actualYieldCurrency: yieldCurrency(row, "actualYieldCurrency"),
    income,
  };
};

// Some funds' latest certificate values and yields, from the app's server
export const fetchInzhurQuotes = async (ids?: readonly string[]): Promise<InzhurQuotesResponse> => {
  const query = ids?.length ? `?ids=${encodeURIComponent(ids.join(","))}` : "";
  const response = await fetch(`/api/inzhur${query}`, { cache: "no-store" });
  if (!response.ok) throw new InzhurError(response.status);
  const body: unknown = await response.json();
  return {
    quotes: readArray(body, "quotes")
      .map(parseQuote)
      .filter((quote) => quote !== null),
    fetchedAt: readString(body, "fetchedAt") ?? new Date().toISOString(),
    partial: isRecord(body) && body.partial === true,
  };
};
