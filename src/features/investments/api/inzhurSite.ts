import "server-only";
import type { InzhurQuote, YieldCurrency } from "@/features/investments/api/inzhur";
import { INZHUR_FUNDS } from "@/features/investments/model/inzhur";
import { log } from "@/shared/lib/log";

const ORIGIN = "https://www.inzhur.reit";
const USER_AGENT = "Mozilla/5.0 (compatible; finance/1.0.0; +https://github.com/sacrificed666/finance)";
const TIMEOUT_MS = 12_000;
const CACHE_TTL_MS = 10 * 60 * 1000;

// The label the page shows under the net asset value per certificate
const NAV_LABEL = "ВЧА\\s+на\\s+(?:1\\s+)?сертифікат";
const NAV_KEY = "certificateNetAssetPrice";
const NAV_WINDOW = 240;

export interface QuotesCache {
  quotes: Map<string, InzhurQuote>;
  fetchedAt: number;
}

// The last quotes read, kept for ten minutes
let cache: QuotesCache | null = null;

// A Ukrainian number such as "1 234,56 ₴", or null when it is not a positive one
export const parseUaNumber = (raw: string): number | null => {
  const cleaned = raw.replaceAll(/\s/gu, "").replaceAll("₴", "").replace(",", ".");
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 ? value : null;
};

// The net asset value per certificate, from the rendered page or its data
export const extractNav = (html: string): number | null => {
  const text = html.replaceAll(/&quot;|&#34;|&#x22;/giu, '"');
  const rendered = new RegExp(`<dd[^>]*>([^<]*)</dd>\\s*<dt[^>]*>\\s*${NAV_LABEL}\\s*</dt>`, "u").exec(text);
  const shown = rendered?.[1] ? parseUaNumber(rendered[1]) : null;
  if (shown) return shown;
  const key = text.indexOf(`"${NAV_KEY}"`);
  if (key <= 0) return null;
  const before = text.slice(Math.max(0, key - NAV_WINDOW), key);
  const quoted = [...before.matchAll(/"([0-9][0-9\s]*(?:[.,][0-9]+)?)"/gu)].toReversed();
  return quoted.map((match) => (match[1] ? parseUaNumber(match[1]) : null)).find((value) => value !== null) ?? null;
};

// The page's visible text in one line, without scripts, styles and tags
export const pageText = (html: string): string =>
  html
    .replaceAll(/<script[\s\S]*?<\/script>/gu, " ")
    .replaceAll(/<style[\s\S]*?<\/style>/gu, " ")
    .replaceAll(/<[^>]+>/gu, " ")
    .replaceAll(/&nbsp;|&#160;/gu, " ")
    .replaceAll(/\s+/gu, " ");

// A yield in percent, or undefined when it is missing or not believable
const parsePct = (raw: string | undefined): number | undefined => {
  if (!raw) return undefined;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) && value > 0 && value < 200 ? value : undefined;
};

// The currency the words after a yield name
const currencyOf = (raw: string | undefined): YieldCurrency | undefined => {
  if (!raw) return undefined;
  if (/USD|долар/u.test(raw)) return "USD";
  return /UAH|гривн/u.test(raw) ? "UAH" : undefined;
};

const PROJECTED_RE =
  /прогнозован[а-яіїєґ']*\s+(?:середньорічн[а-яіїєґ']*\s+)?(?:прост[а-яіїєґ']*\s+)?дохідн[а-яіїєґ']*\s+фонду/giu;
const ACTUAL_RE = /фактичн[а-яіїєґ']*\s+дохідн[а-яіїєґ']*\s+фонду/giu;

// A percentage or a range of two, with hyphens or dashes, and the words after it
const PCT_RE = /(\d{1,3}(?:[.,]\d{1,2})?)(?:\s*[-\u2013\u2014]\s*(\d{1,3}(?:[.,]\d{1,2})?))?\s*%([^%]{0,40})/giu;
const LABEL_LEAD = 90;
const LABEL_TAIL = 220;

export interface Yield {
  min: number;
  max?: number;
  currency?: YieldCurrency;
}

// The first or last believable yield in a piece of text
const readPct = (fragment: string, pick: "first" | "last"): Yield | null => {
  const found = [...fragment.matchAll(PCT_RE)].flatMap((match): Yield[] => {
    const min = parsePct(match[1]);
    if (!min) return [];
    const result: Yield = { min };
    const max = parsePct(match[2]);
    const currency = currencyOf(match[3]);
    if (max !== undefined) result.max = max;
    if (currency) result.currency = currency;
    return [result];
  });
  return (pick === "first" ? found[0] : found.at(-1)) ?? null;
};

// The yield just before a label, or else just after it
const yieldNear = (text: string, label: RegExp): Yield | null => {
  for (const match of text.matchAll(label)) {
    const start = match.index;
    const before = readPct(text.slice(Math.max(0, start - LABEL_LEAD), start), "last");
    if (before) return before;
    const tail = start + match[0].length;
    const after = readPct(text.slice(tail, tail + LABEL_TAIL), "first");
    if (after) return after;
  }
  return null;
};

// The yield the fund projects
export const projectedYield = (text: string): Yield | null => yieldNear(text, PROJECTED_RE);

// The yield the fund has paid
export const actualYield = (text: string): Yield | null => yieldNear(text, ACTUAL_RE);

// A fund's page, or null when it does not answer in time
const fetchFundPage = async (slug: string): Promise<string | null> => {
  try {
    const res = await fetch(`${ORIGIN}/offer/${encodeURIComponent(slug)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
};

// A quote from a fund page, with the fund's own yields where the page has none
export const quoteFromPage = (fund: (typeof INZHUR_FUNDS)[number], html: string): InzhurQuote | null => {
  const nav = extractNav(html);
  if (nav === null) return null;
  const text = pageText(html);
  const projected = projectedYield(text);
  const actual = actualYield(text);
  const quote: InzhurQuote = {
    id: fund.id,
    name: fund.name,
    navPerCertificate: nav,
    projectedYieldPct: projected?.min ?? fund.projectedYieldPct,
    projectedCurrency: projected?.currency ?? fund.linkedCurrency,
    income: fund.income,
  };
  const max = projected ? projected.max : fund.projectedYieldMaxPct;
  if (max !== undefined) quote.projectedYieldMaxPct = max;
  if (actual) quote.actualYieldPct = actual.min;
  if (actual?.currency) quote.actualYieldCurrency = actual.currency;
  return quote;
};

// Every fund's quote, null for the pages that did not answer
const loadQuotes = (): Promise<Array<InzhurQuote | null>> =>
  Promise.all(
    INZHUR_FUNDS.map(async (fund) => {
      const html = await fetchFundPage(fund.slug);
      return html ? quoteFromPage(fund, html) : null;
    }),
  );

// The quotes, read again when ten minutes old; older ones stay for funds that fail
export const cachedQuotes = async (now: number): Promise<QuotesCache | null> => {
  if (cache && now - cache.fetchedAt <= CACHE_TTL_MS) return cache;
  try {
    const loaded = await loadQuotes();
    const quotes = new Map(cache?.quotes ?? []);
    for (const quote of loaded) if (quote) quotes.set(quote.id, quote);
    if (quotes.size > 0) cache = { quotes, fetchedAt: now };
  } catch (error) {
    log.error("Inzhur pages failed", { error: String(error) });
  }
  return cache;
};
