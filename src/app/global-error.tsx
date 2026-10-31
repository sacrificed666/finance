"use client";

import { useEffect, useState } from "react";

import { reportClientError } from "@/features/settings/api/serverErrors";
import { loadMessages, type Messages } from "@/shared/i18n/catalog";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "@/shared/i18n/locales";

interface GlobalErrorProps {
  error: unknown;
  retry: () => void;
}

// The plain look of a page drawn without the app's styles, light or dark
const LOOK = `
  :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
  body { margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: 1rem; box-sizing: border-box; }
  main { max-width: 32rem; text-align: center; }
  h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
  p { margin: 0 0 1.25rem; opacity: 0.75; line-height: 1.5; }
  button { font: inherit; font-weight: 600; padding: 0.625rem 1.25rem; border-radius: 999px; border: 0;
    background: #c8f560; color: #111; cursor: pointer; }
`;

// The language the account chose, from its cookie, or the browser's
const pickLocale = (): Locale => {
  const cookie = document.cookie.split("; ").find((part) => part.startsWith(`${LOCALE_COOKIE}=`));
  const chosen = cookie?.slice(LOCALE_COOKIE.length + 1);
  if (isLocale(chosen)) return chosen;
  const browser = navigator.language.slice(0, 2);
  return isLocale(browser) ? browser : DEFAULT_LOCALE;
};

// Stands in for the whole app when its frame itself failed to draw
const GlobalError = ({ error, retry }: GlobalErrorProps) => {
  const [text, setText] = useState<{ locale: Locale; messages: Messages } | null>(null);

  // Reports the failure and finds the words in the account's language
  useEffect(() => {
    void reportClientError(error, window.location.pathname);
    const locale = pickLocale();
    void loadMessages(locale).then((messages) => setText({ locale, messages }));
  }, [error]);

  return (
    <html lang={text?.locale ?? DEFAULT_LOCALE}>
      <body>
        <style>{LOOK}</style>
        {text && (
          <main>
            <title>{text.messages["errorPage.title"]}</title>
            <h1>{text.messages["errorPage.title"]}</h1>
            <p>{text.messages["errorPage.reloadBody"]}</p>
            <button type="button" onClick={retry}>
              {text.messages["shell.tryAgain"]}
            </button>
          </main>
        )}
      </body>
    </html>
  );
};

export default GlobalError;
