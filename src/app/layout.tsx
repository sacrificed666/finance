import "./globals.scss";
import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import type { ReactNode } from "react";

import ServiceWorker from "@/features/notifications/ui/ServiceWorker/ServiceWorker";
import { DEFAULT_THEME, isThemePref, THEME_COOKIE } from "@/features/settings/model/preferences";
import { requestLocale, serverMessages, serverT } from "@/shared/i18n/server";
import { PAGE_BOOT } from "@/shared/lib/navigation";
import { SITE } from "@/shared/lib/site";
import Backdrop from "@/widgets/Backdrop/Backdrop";

import { montserrat } from "./fonts";
import LocaleBridge from "./LocaleBridge";
import StoreProvider from "./StoreProvider";

// The app's name and description in the visitor's language
export const generateMetadata = async (): Promise<Metadata> => {
  const t = serverT(await requestLocale());
  const name = t("app.name");
  return {
    title: { default: name, template: `%s · ${name}` },
    description: t("pwa.description"),
    applicationName: name,
    appleWebApp: { capable: true, title: name, statusBarStyle: "default" },
    robots: { index: false, follow: false },
  };
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: SITE.themeColor.light },
    { media: "(prefers-color-scheme: dark)", color: SITE.themeColor.dark },
  ],
};

interface RootLayoutProps {
  children: ReactNode;
}

// The document: the saved theme, the backdrop, the data and language
const RootLayout = async ({ children }: RootLayoutProps) => {
  const [locale, cookieStore, headerStore] = await Promise.all([requestLocale(), cookies(), headers()]);
  const saved = cookieStore.get(THEME_COOKIE)?.value;
  const nonce = headerStore.get("x-nonce") ?? undefined;
  return (
    <html
      lang={locale}
      data-theme={isThemePref(saved) ? saved : DEFAULT_THEME}
      suppressHydrationWarning
      className={montserrat.variable}
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: PAGE_BOOT }} />
      </head>
      <body>
        <Backdrop />
        <StoreProvider>
          <LocaleBridge initialLocale={locale} initialMessages={serverMessages(locale)}>
            <ServiceWorker />
            {children}
          </LocaleBridge>
        </StoreProvider>
      </body>
    </html>
  );
};

export default RootLayout;
