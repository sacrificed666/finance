"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import { allocationHistory, allocationSeries, type AllocationBy } from "@/features/accounts/model/allocationHistory";
import { ACCOUNT_KINDS } from "@/features/accounts/model/kinds";
import { historyMonths } from "@/features/data/model/finmath";
import { INVESTMENT_KINDS } from "@/features/investments/model/kinds";
import { usePersistentState } from "@/shared/hooks/usePersistentState";
import { useI18n } from "@/shared/i18n/useI18n";
import { chartSpan, seriesColor } from "@/shared/lib/chart";
import { formatMonthShort, monthOf, todayISO } from "@/shared/lib/date";
import { oneOf } from "@/shared/lib/listing";
import { CURRENCIES, CURRENCY_SYMBOL, formatMoney, formatPercent } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";
import ChartTable from "@/shared/ui/ChartTable/ChartTable";
import PeriodTabs from "@/shared/ui/PeriodTabs/PeriodTabs";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";

import styles from "./AllocationCard.module.scss";

// How the assets were split month by month, by kind of account or by currency
const AllocationCard = () => {
  const { state } = useStore();
  const { t } = useI18n();
  const today = todayISO();
  const base = state.settings.baseCurrency;
  const [by, setBy] = usePersistentState<AllocationBy>("allocation.by", "kind", oneOf(["kind", "currency"]));
  const [chosen, setChosen] = useState(12);
  const recorded = historyMonths(state.transactions, monthOf(today));
  const span = chartSpan(recorded, chosen);
  const history = allocationHistory(state, today, span.months, by);
  if (recorded < 2 || history.filter((month) => month.total > 0).length < 2) return null;
  const series = allocationSeries(history);
  const latest = history.at(-1);

  // What a part of the assets is called
  const label = (id: string) => {
    const [family, value] = id.split(":");
    const currency = CURRENCIES.find((code) => code === id);
    if (currency) return `${CURRENCY_SYMBOL[currency]} ${currency}`;
    const account = ACCOUNT_KINDS.find((kind) => kind.value === value);
    if (family === "acc" && account) return t(`accountKind.${account.value}`);
    const position = INVESTMENT_KINDS.find((kind) => kind.value === value);
    return position ? t(`investmentKind.${position.value}`) : id;
  };
  // A part's share of a month, from nothing to one
  const shareOf = (month: (typeof history)[number], id: string) =>
    month.total > 0 ? (month.parts.find((part) => part.id === id)?.base ?? 0) / month.total : 0;

  return (
    <Card
      title={t("allocation.title")}
      subtitle={t("allocation.subtitle")}
      icon="pie"
      action={
        <div className={styles.controls}>
          <SegmentedControl<AllocationBy>
            size="sm"
            label={t("allocation.by")}
            options={[
              { value: "kind", label: t("allocation.byKind") },
              { value: "currency", label: t("allocation.byCurrency") },
            ]}
            value={by}
            onChange={setBy}
          />
          {span.periods.length > 1 && <PeriodTabs value={span.value} onChange={setChosen} options={span.periods} />}
        </div>
      }
    >
      <div className={styles.columns} aria-hidden>
        {history.map((month) => (
          <div key={month.month} className={styles.column}>
            <div className={styles.stack}>
              {series.map((part) => {
                const share = shareOf(month, part.id);
                return share > 0 ? (
                  <span
                    key={part.id}
                    className={styles.segment}
                    style={{ flexGrow: share, backgroundColor: seriesColor(part.slot) }}
                    title={`${label(part.id)} ${formatPercent(share * 100, 0)}`}
                  />
                ) : null;
              })}
            </div>
            <span className={styles.month}>{formatMonthShort(month.month)}</span>
          </div>
        ))}
      </div>
      <ul className={styles.legend}>
        {series.map((part) => (
          <li key={part.id} className={styles.item}>
            <span className={styles.dot} style={{ backgroundColor: seriesColor(part.slot) }} />
            <span className={styles.name}>
              {part.icon ? `${part.icon} ` : ""}
              {label(part.id)}
            </span>
            {latest && <span className={styles.share}>{formatPercent(shareOf(latest, part.id) * 100, 0)}</span>}
          </li>
        ))}
      </ul>
      <ChartTable
        caption={t("allocation.title")}
        columns={[t("allocation.month"), ...series.map((part) => label(part.id)), t("allocation.total")]}
        rows={history.map((month) => ({
          key: month.month,
          cells: [
            formatMonthShort(month.month),
            ...series.map((part) => formatPercent(shareOf(month, part.id) * 100, 0)),
            formatMoney(month.total, base, { compact: true }),
          ],
        }))}
      />
    </Card>
  );
};

export default AllocationCard;
