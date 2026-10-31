import "server-only";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";

import type { Messages } from "./catalog";
import { isLocale, LOCALE_COOKIE, type Locale, negotiateLocale } from "./locales";
import { cs } from "./messages/cs";
import { de } from "./messages/de";
import { en, type MessageKey } from "./messages/en";
import { es } from "./messages/es";
import { fr } from "./messages/fr";
import { it } from "./messages/it";
import { nl } from "./messages/nl";
import { pl } from "./messages/pl";
import { pt } from "./messages/pt";
import { uk } from "./messages/uk";

// Every dictionary, for texts the server writes
const MESSAGES: Record<Locale, Messages> = { en, uk, cs, de, es, fr, it, nl, pl, pt };

// The dictionary of a language
export const serverMessages = (locale: Locale): Messages => MESSAGES[locale];

// The visitor's language: the cookie, then the browser's languages, then English
export const requestLocale = async (): Promise<Locale> => {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(stored)) return stored;
  return negotiateLocale((await headers()).get("accept-language"));
};

// A plain translator for metadata, with English for a missing key
export const serverT =
  (locale: Locale) =>
  (key: MessageKey): string =>
    MESSAGES[locale][key] ?? en[key];

// The metadata of a page whose title is a message, in the visitor's language
export const titled = (key: MessageKey) => async (): Promise<Metadata> => ({
  title: serverT(await requestLocale())(key),
});
