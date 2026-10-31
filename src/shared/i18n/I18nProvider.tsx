"use client";

import { type ReactNode, useEffect, useMemo } from "react";

import type { Messages } from "./catalog";
import { I18nContext } from "./context";
import { setFormatLocale } from "./format";
import type { Locale } from "./locales";
import { LOCALE_COOKIE } from "./locales";
import { makeI18n } from "./translate";

interface I18nProviderProps {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}

// Gives Client Components the translator, and remembers the language in a cookie
const I18nProvider = ({ locale, messages, children }: I18nProviderProps) => {
  const value = useMemo(() => makeI18n(locale, messages), [locale, messages]);
  // Dates and money format in the same language as the texts
  setFormatLocale(value.intl);

  // The page language and the cookie the server reads on the next visit
  useEffect(() => {
    document.documentElement.lang = locale;
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  }, [locale]);

  return <I18nContext value={value}>{children}</I18nContext>;
};

export default I18nProvider;
