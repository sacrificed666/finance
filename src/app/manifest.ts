import type { MetadataRoute } from "next";

import { requestLocale, serverT } from "@/shared/i18n/server";
import { SITE } from "@/shared/lib/site";

// The web app manifest in the visitor's language, with its icons and shortcuts
const manifest = async (): Promise<MetadataRoute.Manifest> => {
  const locale = await requestLocale();
  const t = serverT(locale);
  return {
    id: "/",
    name: t("app.name"),
    short_name: t("app.name"),
    description: t("pwa.description"),
    lang: locale,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: SITE.themeColor.dark,
    theme_color: SITE.themeColor.dark,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: t("dash.addExpense"), url: "/?add=expense", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      {
        name: t("palette.addIncome"),
        url: "/income?add=income",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      { name: t("nav.calendar"), url: "/calendar", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
};

export default manifest;
