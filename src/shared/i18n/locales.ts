export const LOCALES = ["en", "uk", "cs", "de", "es", "fr", "it", "nl", "pl", "pt"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

// The cookie that tells the server the language before the account's data arrives
export const LOCALE_COOKIE = "finance-locale";

export interface LocaleInfo {
  name: string;
  english: string;
  intl: string;
  flag: string;
}

// The native and English names, the formatting tag and the flag of every language
export const LOCALE_INFO: Record<Locale, LocaleInfo> = {
  en: { name: "English", english: "English", intl: "en-GB", flag: "GB" },
  uk: { name: "Українська", english: "Ukrainian", intl: "uk-UA", flag: "UA" },
  cs: { name: "Čeština", english: "Czech", intl: "cs-CZ", flag: "CZ" },
  de: { name: "Deutsch", english: "German", intl: "de-DE", flag: "DE" },
  es: { name: "Español", english: "Spanish", intl: "es-ES", flag: "ES" },
  fr: { name: "Français", english: "French", intl: "fr-FR", flag: "FR" },
  it: { name: "Italiano", english: "Italian", intl: "it-IT", flag: "IT" },
  nl: { name: "Nederlands", english: "Dutch", intl: "nl-NL", flag: "NL" },
  pl: { name: "Polski", english: "Polish", intl: "pl-PL", flag: "PL" },
  pt: { name: "Português", english: "Portuguese", intl: "pt-PT", flag: "PT" },
};

// Whether a value is a supported language
export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (LOCALES as readonly string[]).includes(value);

interface WeightedLanguage {
  language: string;
  weight: number;
}

// Languages of an Accept-Language header with their weights
const parseAcceptLanguage = (header: string): WeightedLanguage[] =>
  header
    .split(",")
    .map((part) => {
      const [tag = "", ...parameters] = part.trim().split(";");
      const quality = parameters.map((parameter) => parameter.trim()).find((parameter) => parameter.startsWith("q="));
      const weight = quality ? Number.parseFloat(quality.slice(2)) : 1;
      return { language: tag.trim().toLowerCase().split("-")[0] ?? "", weight: Number.isFinite(weight) ? weight : 0 };
    })
    .filter((entry) => entry.language !== "" && entry.weight > 0)
    .toSorted((a, b) => b.weight - a.weight);

// The best supported language for an Accept-Language header
export const negotiateLocale = (acceptLanguage: string | null | undefined): Locale => {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const match = parseAcceptLanguage(acceptLanguage).find((entry) => isLocale(entry.language));
  return match && isLocale(match.language) ? match.language : DEFAULT_LOCALE;
};
