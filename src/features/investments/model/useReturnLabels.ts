"use client";

import type { CompoundingFreq, InvestmentKind } from "@/features/data/model/types";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatPercent } from "@/shared/lib/money";

import type { ReturnPolicy } from "./returns";

// The names of how positions pay back and of the yields they promise
export const useReturnLabels = () => {
  const { t } = useI18n();

  // How a position's return reaches its owner
  const returnLabel = (policy: ReturnPolicy, kind: InvestmentKind, freq: CompoundingFreq): string => {
    if (policy.style === "interest") {
      return policy.compounding === "reinvest"
        ? t("balance.inv.mode.compound", { freq: t(`freq.${freq}.adverb`) })
        : t("balance.inv.mode.simple");
    }
    if (policy.style === "coupons") return t("balance.inv.mode.coupons");
    if (policy.style === "dividends") {
      if (policy.compounding === "reinvest") return t("balance.inv.mode.dividendsReinvested");
      return kind === "inzhur" ? t("balance.inv.mode.monthlyDividends") : t("balance.inv.mode.dividends");
    }
    return t("balance.inv.mode.growth");
  };

  // A yearly yield or range of yields, with the currency it is counted in
  const yieldLabel = (min: number, max: number | undefined, currency: string | undefined): string => {
    const pct = max !== undefined && max > min ? `${formatPercent(min)}-${formatPercent(max)}` : formatPercent(min);
    return t("balance.perYear", { pct }) + (currency ? ` · ${currency}` : "");
  };

  return { returnLabel, yieldLabel };
};
