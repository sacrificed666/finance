import { offlinePage } from "@/features/notifications/model/offlinePage";
import { isLocale, LOCALES } from "@/shared/i18n/locales";
import { serverT } from "@/shared/i18n/server";
import { SITE } from "@/shared/lib/site";

export const dynamicParams = false;

// Prerenders the offline page in every language
export const generateStaticParams = () => LOCALES.map((locale) => ({ locale }));

// The page the service worker shows when another page cannot load offline
export const GET = async (_request: Request, { params }: RouteContext<"/offline/[locale]">) => {
  const { locale } = await params;
  if (!isLocale(locale)) return new Response(null, { status: 404 });
  const t = serverT(locale);
  const { html, policy } = offlinePage({
    lang: locale,
    name: t("app.name"),
    title: t("offline.title"),
    message: t("offline.message"),
    retry: t("offline.retry"),
    light: {
      background: SITE.themeColor.light,
      surface: "#ffffff",
      text: "#0f0f12",
      muted: "#46464e",
      accent: "#c6f35e",
      onAccent: "#0b0d05",
    },
    dark: {
      background: SITE.themeColor.dark,
      surface: "#121215",
      text: "#f4f4f1",
      muted: "#ababb2",
      accent: "#c6f35e",
      onAccent: "#0b0d05",
    },
  });
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": policy,
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "noindex",
    },
  });
};
