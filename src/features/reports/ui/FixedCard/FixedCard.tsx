"use client";

import type { Report } from "@/features/reports/model/report";
import { useI18n } from "@/shared/i18n/useI18n";
import type { BreakdownSegment } from "@/shared/lib/chart";
import { formatMoney, formatPercent, type Currency } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";
import CategoryBreakdown from "@/shared/ui/CategoryBreakdown/CategoryBreakdown";

import styles from "./FixedCard.module.scss";

interface FixedCardProps {
  r: Report;
  currency: Currency;
}

// The colour slots of the fixed and the flexible part
const FIXED_SLOT = 6;
const FLEXIBLE_SLOT = 2;

// The spending fixed by recurring rules and subscriptions, and its share of income
const FixedCard = ({ r, currency }: FixedCardProps) => {
  const { t } = useI18n();
  const { expense, fixed, income } = r.current;
  if (expense <= 0) return null;
  const segments: BreakdownSegment[] = [
    { id: "fixed", label: t("reports.fixed.fixed"), icon: "🔁", value: fixed, colorSlot: FIXED_SLOT },
    {
      id: "flexible",
      label: t("reports.fixed.flexible"),
      icon: "🛒",
      value: Math.max(0, expense - fixed),
      colorSlot: FLEXIBLE_SLOT,
    },
  ];
  const change = fixed - r.previous.fixed;
  const notes = [
    income > 0 && t("reports.fixed.ofIncome", { pct: formatPercent((fixed / income) * 100, 0) }),
    r.previous.fixed > 0 &&
      Math.abs(change) >= 0.5 &&
      t("reports.vsPrev", { delta: formatMoney(change, currency, { compact: true, sign: true }) }),
  ].filter(Boolean);

  return (
    <Card title={t("reports.fixed")} subtitle={t("reports.fixed.subtitle")} icon="repeat">
      {fixed > 0 ? (
        <>
          <CategoryBreakdown segments={segments} currency={currency} />
          {notes.length > 0 && <p className={styles.note}>{notes.join(" · ")}</p>}
        </>
      ) : (
        <p className={styles.note}>{t("reports.fixed.none")}</p>
      )}
    </Card>
  );
};

export default FixedCard;
