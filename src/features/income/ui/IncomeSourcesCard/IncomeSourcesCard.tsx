"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import { incomeByCategory, rollupToParents } from "@/features/data/model/finmath";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import { incomeByCurrency } from "@/features/income/model/income";
import { useI18n } from "@/shared/i18n/useI18n";
import type { BreakdownSegment } from "@/shared/lib/chart";
import { addMonths, monthOf, todayISO } from "@/shared/lib/date";
import { CURRENCY_SLOT, CURRENCY_SYMBOL, formatMoney } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";
import CategoryBreakdown from "@/shared/ui/CategoryBreakdown/CategoryBreakdown";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";

import styles from "./IncomeSourcesCard.module.scss";

type SourcesView = "source" | "currency";

// Where a year's income came from, by source or currency; away without any
const IncomeSourcesCard = () => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const category = useCategoryName();
  const { settings } = state;
  const base = settings.baseCurrency;
  const today = todayISO();
  const month = monthOf(today);
  const [view, setView] = useState<SourcesView>("source");

  const byCategory = rollupToParents(
    incomeByCategory(state.transactions, addMonths(month, -11), month, settings),
    state.categories,
  );
  const sources: BreakdownSegment[] = [...byCategory].map(([id, value]) => {
    const entry = state.categories.find((item) => item.id === id);
    return { id, label: category(entry), icon: entry?.icon ?? "💰", value, colorSlot: entry?.colorSlot ?? 3 };
  });
  const byCurrency = incomeByCurrency(state, today);
  const currencies: BreakdownSegment[] = byCurrency.map((entry) => ({
    id: entry.currency,
    label: entry.currency,
    icon: CURRENCY_SYMBOL[entry.currency],
    value: entry.base,
    colorSlot: CURRENCY_SLOT[entry.currency],
  }));
  const showCurrency = view === "currency" && byCurrency.length > 1;
  // The amount in its own currency under a foreign currency's row
  const native = (id: string) => {
    const row = byCurrency.find((entry) => entry.currency === id);
    if (!showCurrency || !row || row.currency === base) return null;
    return <p className={styles.native}>{formatMoney(row.native, row.currency)}</p>;
  };

  if (sources.length === 0) return null;

  return (
    <Card
      title={t("income.bySource")}
      subtitle={`${t("common.last12")} · ${tp("income.sources", sources.length)}`}
      icon="pie"
      action={
        byCurrency.length > 1 ? (
          <SegmentedControl<SourcesView>
            size="sm"
            label={t("income.bySource")}
            options={[
              { value: "source", label: t("income.source") },
              { value: "currency", label: t("common.currency") },
            ]}
            value={view}
            onChange={setView}
          />
        ) : undefined
      }
    >
      <CategoryBreakdown
        segments={showCurrency ? currencies : sources}
        currency={base}
        maxSegments={7}
        rowExtra={native}
      />
    </Card>
  );
};

export default IncomeSourcesCard;
