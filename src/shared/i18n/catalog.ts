import type { Locale } from "./locales";

export type Messages = Record<string, string>;

// Each language's messages, loaded on demand
const LOADERS: Record<Locale, () => Promise<Messages>> = {
  en: () => import("@/shared/i18n/messages/en").then((m) => m.en),
  uk: () => import("@/shared/i18n/messages/uk").then((m) => m.uk),
  cs: () => import("@/shared/i18n/messages/cs").then((m) => m.cs),
  de: () => import("@/shared/i18n/messages/de").then((m) => m.de),
  es: () => import("@/shared/i18n/messages/es").then((m) => m.es),
  fr: () => import("@/shared/i18n/messages/fr").then((m) => m.fr),
  it: () => import("@/shared/i18n/messages/it").then((m) => m.it),
  nl: () => import("@/shared/i18n/messages/nl").then((m) => m.nl),
  pl: () => import("@/shared/i18n/messages/pl").then((m) => m.pl),
  pt: () => import("@/shared/i18n/messages/pt").then((m) => m.pt),
};

// The messages already loaded
const loaded = new Map<Locale, Messages>();

// A language's messages when they are loaded already
export const cachedMessages = (locale: Locale): Messages | undefined => loaded.get(locale);

// Keeps messages the server sent along, so they need no loading
export const rememberMessages = (locale: Locale, messages: Messages): void => {
  loaded.set(locale, messages);
};

// A language's messages, loaded once
export const loadMessages = async (locale: Locale): Promise<Messages> => {
  const known = loaded.get(locale);
  if (known) return known;
  const messages = await LOADERS[locale]();
  loaded.set(locale, messages);
  return messages;
};
