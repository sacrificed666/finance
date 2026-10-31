"use client";

import { useI18n } from "@/shared/i18n/useI18n";
import { formatMonth } from "@/shared/lib/date";

// Names a tax period: a quarter as "Q2 2026", a month by its name, a year as it is
export const usePeriodLabel = () => {
  const { t } = useI18n();
  return (period: string) => {
    const quarter = /^(\d{4})-Q(\d)$/u.exec(period);
    if (quarter) return t("taxcal.quarter", { q: quarter[2] ?? "", year: quarter[1] ?? "" });
    if (/^\d{4}-\d{2}$/u.test(period)) return formatMonth(period);
    return period;
  };
};
