"use client";

import { useStore } from "@/app/hooks";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import { usePeriodLabel } from "@/features/income/model/usePeriodLabel";
import { useI18n } from "@/shared/i18n/useI18n";

import { daySummaries, entryEvents, keyDates, monthObligations, type EventNames } from "./monthEvents";

// A month's days with their events, its key dates and its tax deadlines
export const useMonthEvents = (month: string) => {
  const { state } = useStore();
  const { t } = useI18n();
  const category = useCategoryName();
  const periodLabel = usePeriodLabel();
  const names: EventNames = {
    category,
    // A deadline named by what is due and for which period
    obligation: (obligation) => t(`taxcal.${obligation.kind}`, { period: periodLabel(obligation.period) }),
    paid: t("taxcal.paid"),
    matures: t("balance.inv.matures"),
    receivables: t("receivables.title"),
    grace: t("dash.coming.grace"),
    wishes: t("wish.title"),
  };
  const dates = keyDates(state, month, names);
  return {
    days: daySummaries(state, month, [...entryEvents(state, month, names), ...dates]),
    keyDates: dates,
    obligations: monthObligations(state, month),
  };
};
