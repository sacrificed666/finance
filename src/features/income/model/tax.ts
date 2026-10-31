import type { Settings, TaxProfile, TaxRegimeId } from "@/features/data/model/types";
import type { MessageKey } from "@/shared/i18n/messages/en";
import { convert, type Currency } from "@/shared/lib/money";

interface YearFigures {
  minimumWage: number;
  livingMinimum: number;
}

// The minimum wage and living minimum each tax year starts with
export const TAX_YEARS: Readonly<Record<number, YearFigures>> = {
  2025: { minimumWage: 8000, livingMinimum: 3028 },
  2026: { minimumWage: 8647, livingMinimum: 3328 },
};

// The years in the table, oldest first
const KNOWN_YEARS = Object.keys(TAX_YEARS)
  .map(Number)
  .toSorted((a, b) => a - b);

export interface TaxYearValues extends YearFigures {
  year: number;
  known: boolean;
}

// A year's figures, or the nearest known year's when it is not in the table
export const taxYearValues = (year: number): TaxYearValues => {
  const exact = TAX_YEARS[year];
  if (exact) return { year, ...exact, known: true };
  const first = KNOWN_YEARS[0] ?? 2026;
  const last = KNOWN_YEARS.at(-1) ?? first;
  const nearest = year > last ? last : first;
  return { year: nearest, ...(TAX_YEARS[nearest] ?? { minimumWage: 0, livingMinimum: 0 }), known: false };
};

// A sum rounded to kopiykas
const cents = (value: number) => Math.round(value * 100) / 100;

// The least social contribution of a month: 22% of the minimum wage
export const esvMinimum = (year: number): number => cents(taxYearValues(year).minimumWage * 0.22);

const CURRENT_YEAR = new Date().getFullYear();

export const ESV_MIN_UAH = esvMinimum(CURRENT_YEAR);

export interface TaxComponent {
  id: string;
  labelKey: MessageKey;
  ratePct?: number;
  fixedUAH?: number;
}

export interface TaxRegime {
  id: TaxRegimeId;
  labelKey: MessageKey;
  shortKey: MessageKey;
  hintKey: MessageKey;
  ratePct: number;
  fixedUAH: number;
  vatPct: number;
  annualLimitUAH: number;
  components: TaxComponent[];
  editable: boolean;
}

// The texts of a regime, named after it
const texts = <Id extends TaxRegimeId>(id: Id) =>
  ({
    id,
    labelKey: `tax.regime.${id}`,
    shortKey: `tax.regime.${id}.short`,
    hintKey: `tax.regime.${id}.hint`,
  }) as const;

// Every regime with a year's figures
const regimesOf = (year: number): Record<TaxRegimeId, TaxRegime> => {
  const { minimumWage, livingMinimum } = taxYearValues(year);
  const esv = cents(minimumWage * 0.22);
  const levy = cents(minimumWage * 0.1);
  const group1 = cents(livingMinimum * 0.1);
  const group2 = cents(minimumWage * 0.2);
  const plain = { ratePct: 0, fixedUAH: 0, vatPct: 0, annualLimitUAH: 0, components: [], editable: false };
  return {
    none: { ...texts("none"), ...plain },
    fop1: {
      ...texts("fop1"),
      ...plain,
      fixedUAH: cents(group1 + levy + esv),
      annualLimitUAH: 167 * minimumWage,
      components: [
        { id: "single", labelKey: "tax.part.singleTax", fixedUAH: group1 },
        { id: "levy", labelKey: "tax.part.militaryLevy", fixedUAH: levy },
        { id: "esv", labelKey: "tax.part.esv", fixedUAH: esv },
      ],
    },
    fop2: {
      ...texts("fop2"),
      ...plain,
      fixedUAH: cents(group2 + levy + esv),
      annualLimitUAH: 834 * minimumWage,
      components: [
        { id: "single", labelKey: "tax.part.singleTax", fixedUAH: group2 },
        { id: "levy", labelKey: "tax.part.militaryLevy", fixedUAH: levy },
        { id: "esv", labelKey: "tax.part.esv", fixedUAH: esv },
      ],
    },
    fop3: {
      ...texts("fop3"),
      ...plain,
      ratePct: 6,
      fixedUAH: esv,
      annualLimitUAH: 1167 * minimumWage,
      components: [
        { id: "single", labelKey: "tax.part.singleTax", ratePct: 5 },
        { id: "levy", labelKey: "tax.part.militaryLevy", ratePct: 1 },
        { id: "esv", labelKey: "tax.part.esv", fixedUAH: esv },
      ],
    },
    fop3vat: {
      ...texts("fop3vat"),
      ...plain,
      ratePct: 4,
      fixedUAH: esv,
      vatPct: 20,
      annualLimitUAH: 1167 * minimumWage,
      components: [
        { id: "vat", labelKey: "tax.part.vat", ratePct: 20 },
        { id: "single", labelKey: "tax.part.singleTax", ratePct: 3 },
        { id: "levy", labelKey: "tax.part.militaryLevy", ratePct: 1 },
        { id: "esv", labelKey: "tax.part.esv", fixedUAH: esv },
      ],
    },
    fop4: {
      ...texts("fop4"),
      ...plain,
      fixedUAH: cents(levy + esv),
      components: [
        { id: "levy", labelKey: "tax.part.militaryLevy", fixedUAH: levy },
        { id: "esv", labelKey: "tax.part.esv", fixedUAH: esv },
      ],
    },
    general: {
      ...texts("general"),
      ...plain,
      ratePct: 45,
      components: [
        { id: "pit", labelKey: "tax.part.pit", ratePct: 18 },
        { id: "levy", labelKey: "tax.part.militaryLevy", ratePct: 5 },
        { id: "esv", labelKey: "tax.part.esvPct", ratePct: 22 },
      ],
    },
    custom: { ...texts("custom"), ...plain, ratePct: 6, fixedUAH: esv, editable: true },
  };
};

// The regimes of each year asked for so far
const BY_YEAR = new Map<number, Record<TaxRegimeId, TaxRegime>>([[CURRENT_YEAR, regimesOf(CURRENT_YEAR)]]);

// The regimes with this year's figures, in the order of the settings
export const TAX_REGIMES: TaxRegime[] = Object.values(regimesOf(CURRENT_YEAR));

// A regime with a year's figures; none given means no tax
export const taxRegime = (id: TaxRegimeId | undefined, year: number = new Date().getFullYear()): TaxRegime => {
  let regimes = BY_YEAR.get(year);
  if (!regimes) {
    regimes = regimesOf(year);
    BY_YEAR.set(year, regimes);
  }
  return regimes[id ?? "none"];
};

// Whether a regime includes the social contribution, which not everyone pays
export const hasEsv = (id: TaxRegimeId): boolean => taxRegime(id).components.some((part) => part.id === "esv");

// A regime's parts, without the ЄСВ for someone who does not pay it
export const regimeParts = (id: TaxRegimeId, esv: boolean, year: number = CURRENT_YEAR): TaxComponent[] =>
  taxRegime(id, year).components.filter((part) => esv || part.id !== "esv");

// A regime's rates with the social contribution or without it
export const regimeRates = (id: TaxRegimeId, esv: boolean, year: number = CURRENT_YEAR) => {
  const regime = taxRegime(id, year);
  const part = regime.components.find((component) => component.id === "esv");
  if (esv || !part) return { ratePct: regime.ratePct, fixedUAH: regime.fixedUAH, vatPct: regime.vatPct };
  return {
    ratePct: cents(regime.ratePct - (part.ratePct ?? 0)),
    fixedUAH: cents(regime.fixedUAH - (part.fixedUAH ?? 0)),
    vatPct: regime.vatPct,
  };
};

// No tax until a regime is picked: not everyone is a sole proprietor
export const DEFAULT_TAX_PROFILE: TaxProfile = {
  regime: "none",
  ratePct: 0,
  fixedUAH: 0,
  vatPct: 0,
  label: "",
  esv: true,
};

// The tax settings of a regime; a custom one keeps the earlier own figures
export const profileFromRegime = (id: TaxRegimeId, previous?: Partial<TaxProfile>): TaxProfile => {
  const regime = taxRegime(id);
  const esv = previous?.esv ?? true;
  if (!regime.editable) return { regime: id, ...regimeRates(id, esv), label: "", esv };
  return {
    regime: id,
    ratePct: previous?.ratePct ?? regime.ratePct,
    fixedUAH: previous?.fixedUAH ?? regime.fixedUAH,
    vatPct: previous?.vatPct ?? regime.vatPct,
    label: previous?.label ?? "",
    esv,
  };
};

export interface TaxBreakdown {
  gross: number;
  vat: number;
  taxable: number;
  percentPart: number;
  fixedPart: number;
  total: number;
  net: number;
  effectivePct: number;
}

// What a gross income loses to VAT, the percentage and the fixed part
export const taxBreakdown = (
  gross: number,
  currency: Currency,
  profile: TaxProfile,
  settings: Settings,
): TaxBreakdown => {
  const vat = profile.vatPct > 0 ? gross - gross / (1 + profile.vatPct / 100) : 0;
  const taxable = gross - vat;
  const percentPart = (taxable * profile.ratePct) / 100;
  const fixedPart = convert(profile.fixedUAH, "UAH", currency, settings.rates);
  const total = vat + percentPart + fixedPart;
  return {
    gross,
    vat,
    taxable,
    percentPart,
    fixedPart,
    total,
    net: gross - total,
    effectivePct: gross > 0 ? (total / gross) * 100 : 0,
  };
};

export interface Headroom {
  limit: number;
  used: number;
  remaining: number;
  pct: number;
}

// How much of a regime's yearly income limit is used, or null without a limit
export const regimeAnnualHeadroom = (
  id: TaxRegimeId,
  grossThisYearUAH: number,
  year: number = CURRENT_YEAR,
): Headroom | null => {
  const limit = taxRegime(id, year).annualLimitUAH;
  if (limit <= 0) return null;
  const used = Math.max(0, grossThisYearUAH);
  return { limit, used, remaining: Math.max(0, limit - used), pct: Math.min(100, (used / limit) * 100) };
};
