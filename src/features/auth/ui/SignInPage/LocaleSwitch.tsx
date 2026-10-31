"use client";

import { useRouter } from "next/navigation";

import { yearCookie } from "@/features/settings/model/preferences";
import { LOCALE_COOKIE } from "@/shared/i18n/locales";
import { useI18n } from "@/shared/i18n/useI18n";
import LanguagePicker from "@/shared/ui/LanguagePicker/LanguagePicker";

// The language of the signed-out pages, kept in a cookie
const LocaleSwitch = () => {
  const { locale } = useI18n();
  const router = useRouter();
  return (
    <LanguagePicker
      compact
      value={locale}
      onChange={(next) => {
        document.cookie = yearCookie(LOCALE_COOKIE, next);
        router.refresh();
      }}
    />
  );
};

export default LocaleSwitch;
