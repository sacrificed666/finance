import type { Messages } from "./catalog";
import { type Locale, LOCALE_INFO } from "./locales";
import type { MessageKey } from "./messages/en";
import { shapeValue } from "./monthCase";

export type MessageParams = Readonly<Record<string, string | number>>;

export interface I18n {
  locale: Locale;
  intl: string;
  t: (key: MessageKey, params?: MessageParams) => string;
  tp: (key: string, count: number, params?: MessageParams) => string;
  has: (key: string) => boolean;
  tk: (key: string, fallback: string, params?: MessageParams) => string;
}

// A placeholder, with how to shape its value after a bar: {month|gen}
const PLACEHOLDER = /\{(\w+)(?:\|(\w+))?\}/gu;

// A text with its placeholders filled; unknown ones stay as they are
const fill = (template: string, intl: string, params?: MessageParams): string =>
  params
    ? template.replaceAll(PLACEHOLDER, (placeholder, name: string, shape: string | undefined) =>
        Object.hasOwn(params, name) ? shapeValue(String(params[name]), shape, intl) : placeholder,
      )
    : template;

// The translators of a language: plain keys, plurals and keys built at run time
export const makeI18n = (locale: Locale, messages: Messages): I18n => {
  const intl = LOCALE_INFO[locale].intl;
  const rules = new Intl.PluralRules(intl);
  // The text of a key, if the language has it
  const lookup = (key: string): string | undefined => messages[key];

  return {
    locale,
    intl,
    // A message, or its key while the messages are still loading
    t: (key, params) => fill(lookup(key) ?? key, intl, params),
    // The plural form the language needs for a count, with {count} filled in
    tp: (key, count, params) => {
      const template = lookup(`${key}.${rules.select(count)}`) ?? lookup(`${key}.other`) ?? key;
      return fill(template, intl, { count, ...params });
    },
    // Whether the language has a key
    has: (key) => lookup(key) !== undefined,
    // A key built at run time, with a fallback for ones the dictionary lacks
    tk: (key, fallback, params) => fill(lookup(key) ?? fallback, intl, params),
  };
};
