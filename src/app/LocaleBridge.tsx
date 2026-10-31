"use client";

import { useEffect, useState, type ReactNode } from "react";

import { cachedMessages, loadMessages, rememberMessages, type Messages } from "@/shared/i18n/catalog";
import I18nProvider from "@/shared/i18n/I18nProvider";
import type { Locale } from "@/shared/i18n/locales";

import { useStore } from "./hooks";

interface LocaleBridgeProps {
  initialLocale: Locale;
  initialMessages: Messages;
  children: ReactNode;
}

interface Shown {
  locale: Locale;
  messages: Messages;
}

// Hands the chosen language to every component once its texts have loaded
const LocaleBridge = ({ initialLocale, initialMessages, children }: LocaleBridgeProps) => {
  const { state, hydrated, loadError } = useStore();
  const wanted = hydrated && !loadError ? state.settings.locale : initialLocale;
  const ready = wanted === initialLocale ? initialMessages : cachedMessages(wanted);
  const [last, setLast] = useState<Shown>({ locale: initialLocale, messages: initialMessages });

  // The server's language needs no second download
  useEffect(() => {
    rememberMessages(initialLocale, initialMessages);
  }, [initialLocale, initialMessages]);

  // Loads a language not seen yet; a failed load keeps the current one
  useEffect(() => {
    if (ready) return;
    let alive = true;
    loadMessages(wanted)
      .then((messages) => {
        if (alive) setLast({ locale: wanted, messages });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [wanted, ready]);

  const shown = ready ? { locale: wanted, messages: ready } : last;
  return (
    <I18nProvider locale={shown.locale} messages={shown.messages}>
      {children}
    </I18nProvider>
  );
};

export default LocaleBridge;
