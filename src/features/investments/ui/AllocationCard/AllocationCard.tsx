"use client";

import { useStore } from "@/app/hooks";
import { investmentColorSlot, investmentKind } from "@/features/investments/model/kinds";
import { investmentsByKind, valueByCurrency } from "@/features/investments/model/positions";
import { useI18n } from "@/shared/i18n/useI18n";
import type { BreakdownSegment } from "@/shared/lib/chart";
import { todayISO } from "@/shared/lib/date";
import { formatPercent } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";
import CategoryBreakdown from "@/shared/ui/CategoryBreakdown/CategoryBreakdown";

import styles from "./AllocationCard.module.scss";

// The positions by kind and currency, once there are two of either
const AllocationCard = () => {
  const { state } = useStore();
  const { t } = useI18n();
  const { settings } = state;
  const base = settings.baseCurrency;
  const today = todayISO();
  const segments: BreakdownSegment[] = investmentsByKind(state.investments, today, settings)
    .filter((row) => row.value > 0)
    .map((row) => ({
      id: row.kind,
      label: t(`investmentKind.${row.kind}`),
      icon: investmentKind(row.kind).icon,
      value: row.value,
      colorSlot: investmentColorSlot(row.kind),
    }));
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const currencies = valueByCurrency(state, today);
  if (segments.length < 2 && currencies.length < 2) return null;

  return (
    <Card title={t("investments.allocation")} subtitle={t("investments.allocation.subtitle")} icon="pie">
      <CategoryBreakdown segments={segments} currency={base} maxSegments={6} />
      {currencies.length > 1 && (
        <div className={styles.currencies}>
          {currencies.map((entry) => (
            <span key={entry.currency} className={styles.currency}>
              {entry.currency} <span className={styles.share}>{formatPercent((entry.value / total) * 100, 0)}</span>
            </span>
          ))}
        </div>
      )}
    </Card>
  );
};

export default AllocationCard;
