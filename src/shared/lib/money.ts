import { formatLocale } from "@/shared/i18n/format";

export type Currency = "UAH" | "USD" | "EUR";

// The hryvnia price of a dollar and a euro
export interface Rates {
  USD: number;
  EUR: number;
}

// Every currency the app keeps amounts in
export const CURRENCIES: Currency[] = ["UAH", "USD", "EUR"];

// The currencies tables always show, used or not
export const CORE_CURRENCIES: Currency[] = ["UAH", "USD", "EUR"];

// The currencies that have an exchange rate
export const FOREIGN_CURRENCIES = ["USD", "EUR"] as const;

// The series colour of each currency in charts
export const CURRENCY_SLOT: Record<Currency, number> = { UAH: 1, USD: 2, EUR: 3 };

// The sign written beside an amount
export const CURRENCY_SYMBOL: Record<Currency, string> = {
  UAH: "₴",
  USD: "$",
  EUR: "€",
};

// Currencies as picker options: the sign shown, the code for screen readers
export const currencyOptions = (list: readonly Currency[]) =>
  list.map((currency) => ({ value: currency, label: CURRENCY_SYMBOL[currency], title: currency }));

// Every currency as the options of a picker
export const CURRENCY_OPTIONS = currencyOptions(CURRENCIES);

// The typographic minus that keeps negative figures aligned
const MINUS = "−";

// What stands for a figure while amounts are hidden
const HIDDEN_FIGURE = "••••";

// Whether amounts show as dots, for using the app where others can see
let amountsHidden = false;

// Hides or shows every amount the formatters write
export const setAmountsHidden = (hidden: boolean): void => {
  amountsHidden = hidden;
};

// Whether amounts show as dots, for figures written outside these formatters
export const areAmountsHidden = (): boolean => amountsHidden;

// What a hidden figure shows instead
export const hiddenFigure = (): string => HIDDEN_FIGURE;

// The hryvnia price of one unit of a currency
export const rateToUAH = (currency: Currency, rates: Rates): number => (currency === "UAH" ? 1 : rates[currency]);

// The rates of the month a date falls in, or today's
export const ratesAt = (settings: { rates: Rates; monthRates?: Record<string, Rates> }, dateISO: string): Rates =>
  settings.monthRates?.[dateISO.slice(0, 7)] ?? settings.rates;

// An amount in another currency at the given rates
export const convert = (amount: number, from: Currency, to: Currency, rates: Rates): number => {
  if (from === to) return amount;
  return (amount * rateToUAH(from, rates)) / rateToUAH(to, rates);
};

const FORMATS = new Map<string, Intl.NumberFormat>();

// A cached number format of the page language with these fraction digits
const numberFormat = (minFraction: number, maxFraction: number): Intl.NumberFormat => {
  const locale = formatLocale();
  const key = `${locale}|${String(minFraction)}-${String(maxFraction)}`;
  let format = FORMATS.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, { minimumFractionDigits: minFraction, maximumFractionDigits: maxFraction });
    FORMATS.set(key, format);
  }
  return format;
};

// A number rounded to some digits after the point
const roundTo = (value: number, digits: number): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

// A number in the page language with the typographic minus
export const formatNumber = (value: number, maxFraction = 2): string =>
  numberFormat(0, maxFraction).format(value).replace(/^-/u, MINUS);

// A short figure such as 12.5K or 1.2M; tight ones shorten from a thousand
export const formatCompact = (amount: number, tight = false): string => {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? MINUS : "";
  if (amountsHidden) return `${sign}${HIDDEN_FIGURE}`;
  if (roundTo(abs / 1000, 1) >= 1000) return `${sign}${numberFormat(0, 1).format(abs / 1_000_000)}M`;
  if (abs >= (tight ? 1000 : 10_000)) return `${sign}${numberFormat(0, 1).format(abs / 1000)}K`;
  return `${sign}${numberFormat(0, 0).format(Math.round(abs))}`;
};

// A currency's sign: after hryvnias with a no-break space, before $ and €
const withSymbol = (body: string, currency: Currency): string => {
  if (currency === "UAH") return `${body}\u00A0${CURRENCY_SYMBOL.UAH}`;
  const match = /^([+−-]?)(.*)$/u.exec(body);
  return `${match?.[1] ?? ""}${CURRENCY_SYMBOL[currency]}${match?.[2] ?? body}`;
};

interface MoneyFormat {
  compact?: boolean;
  tight?: boolean;
  sign?: boolean;
  exact?: boolean;
}

// An amount: whole from 1000, two cents or none below, short if compact
export const formatMoney = (amount: number, currency: Currency, options: MoneyFormat = {}): string => {
  const sign = options.sign && amount > 0 ? "+" : "";
  let body: string;
  if (amountsHidden) body = `${amount < 0 ? MINUS : ""}${HIDDEN_FIGURE}`;
  else if (options.compact) body = formatCompact(amount, options.tight);
  else if (options.exact) body = numberFormat(2, 2).format(roundTo(amount, 2));
  else if (Math.abs(amount) >= 1000) body = numberFormat(0, 0).format(Math.round(amount));
  else {
    const cents = roundTo(amount, 2);
    body = numberFormat(Number.isInteger(cents) ? 0 : 2, 2).format(cents);
  }
  return withSymbol(`${sign}${body.replace(/^-/u, MINUS)}`, currency);
};

// A percentage in the page language
export const formatPercent = (value: number, fraction = 1): string =>
  `${numberFormat(0, fraction).format(value).replace(/^-/u, MINUS)}%`;

const GROUP_MARKS = new Map<string, string>();

// The mark the page language groups thousands with, such as "," or "."
const groupMark = (): string => {
  const locale = formatLocale();
  let mark = GROUP_MARKS.get(locale);
  if (mark === undefined) {
    mark = new Intl.NumberFormat(locale).formatToParts(12_345).find((part) => part.type === "group")?.value ?? "";
    GROUP_MARKS.set(locale, mark);
  }
  return mark;
};

// The text with one mark read as thousands, or as the decimal point
const withOneMark = (text: string, mark: string): string => {
  const grouped = new RegExp(`^\\d{1,3}(?:[${mark}]\\d{3})+$`, "u").test(text);
  const several = text.indexOf(mark) !== text.lastIndexOf(mark);
  if (grouped && (several || mark === groupMark())) return text.replaceAll(mark, "");
  return several ? "" : text.replace(mark, ".");
};

// A number with either decimal mark and the page language's grouping, or NaN
const parseNumber = (text: string): number => {
  let normalized = text;
  if (normalized.includes(",") && normalized.includes(".")) {
    normalized =
      normalized.lastIndexOf(",") > normalized.lastIndexOf(".")
        ? normalized.replaceAll(".", "").replace(",", ".")
        : normalized.replaceAll(",", "");
  } else if (normalized.includes(",") || normalized.includes(".")) {
    normalized = withOneMark(normalized, normalized.includes(",") ? "," : ".");
  }
  const value = normalized === "" ? Number.NaN : Number(normalized);
  return Number.isFinite(value) ? value : Number.NaN;
};

// The signs a sum may be typed with, as on a keypad
const OPERATOR_SIGNS: Partial<Record<string, string>> = { "×": "*", "÷": "/", [MINUS]: "-" };

// Whether a typed amount is a sum to work out, such as 120+45 or 3×85
export const isSum = (input: string): boolean => /\d\s*[-+*/×÷−]\s*[\d.,]/u.test(input);

// A typed amount, or a sum worked out with × and ÷ first; NaN when it is neither
export const parseAmount = (input: string): number => {
  const text = input.replaceAll(/\s/gu, "").replaceAll(/[×÷−]/gu, (char) => OPERATOR_SIGNS[char] ?? char);
  if (text === "") return 0;
  const tokens = text.match(/[\d.,]+|[-+*/]/gu) ?? [];
  if (tokens.join("") !== text) return Number.NaN;
  let total = 0;
  let term = 0;
  let termSign = 1;
  let sign = 1;
  let operator: string | null = null;
  let wantsNumber = true;
  for (const token of tokens) {
    if (wantsNumber && (token === "-" || token === "+")) {
      if (token === "-") sign = -sign;
    } else if (wantsNumber) {
      const value = sign * parseNumber(token);
      if (Number.isNaN(value)) return Number.NaN;
      if (operator === "*") term *= value;
      else if (operator === "/") term /= value;
      else term = value;
      sign = 1;
      wantsNumber = false;
    } else if (token === "*" || token === "/") {
      operator = token;
      wantsNumber = true;
    } else {
      total += termSign * term;
      termSign = token === "-" ? -1 : 1;
      operator = null;
      wantsNumber = true;
    }
  }
  const result = total + termSign * term;
  return !wantsNumber && Number.isFinite(result) ? result : Number.NaN;
};
