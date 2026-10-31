"use client";

import type { Settings } from "@/features/data/model/types";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatDateTime } from "@/shared/lib/date";

// Where the exchange rates came from and when, as a sentence
export const useRatesOrigin = () => {
  const { t } = useI18n();
  return (settings: Settings): string => {
    if (!settings.ratesUpdatedAt) return t("settings.rates.starting");
    let source = t("settings.rates.source.manual");
    if (settings.ratesSource === "monobank") source = t("settings.rates.source.monobank");
    else if (settings.ratesSource === "nbu") source = t("settings.rates.source.nbu");
    return t("settings.rates.updated", { when: formatDateTime(settings.ratesUpdatedAt), source });
  };
};
