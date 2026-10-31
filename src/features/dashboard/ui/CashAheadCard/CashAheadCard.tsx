"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import { cashAhead } from "@/features/dashboard/model/cashAhead";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatDateShort, todayISO } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import BalanceLine from "@/shared/ui/BalanceLine/BalanceLine";
import Card from "@/shared/ui/Card/Card";
import CardLink from "@/shared/ui/CardLink/CardLink";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";
import SummaryPanel from "@/shared/ui/SummaryPanel/SummaryPanel";

import styles from "./CashAheadCard.module.scss";

type Horizon = "30" | "60";

// The spendable money over the next month or two; Coming up lists the dates
const CashAheadCard = () => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const [horizon, setHorizon] = useState<Horizon>("30");
  const days = Number(horizon);
  const base = state.settings.baseCurrency;
  const today = todayISO();
  const { start, points, upcoming, lowest, firstBelowZero, end } = cashAhead(state, today, days);
  // A short amount in the base currency
  const money = (amount: number, sign = false) => formatMoney(amount, base, { compact: true, sign });

  return (
    <Card
      title={t("dash.ahead", { days })}
      subtitle={t("dash.ahead.subtitle")}
      icon="calendar"
      action={
        <>
          <SegmentedControl<Horizon>
            size="sm"
            label={t("dash.ahead.horizon")}
            options={[
              { value: "30", label: t("dash.ahead.days", { days: 30 }) },
              { value: "60", label: t("dash.ahead.days", { days: 60 }) },
            ]}
            value={horizon}
            onChange={setHorizon}
          />
          <CardLink href="/calendar" />
        </>
      }
    >
      <SummaryPanel
        className={styles.summary}
        value={
          <>
            {money(end.value)}
            <span className={styles.endDate}> · {formatDateShort(end.date)}</span>
          </>
        }
        tone={end.value < 0 ? "expense" : undefined}
        meta={
          firstBelowZero ? (
            <span className={styles.dip}>{t("dash.ahead.dips", { date: formatDateShort(firstBelowZero.date) })}</span>
          ) : (
            t("dash.ahead.lowest", { amount: money(lowest.value), date: formatDateShort(lowest.date) })
          )
        }
      >
        <p className={styles.now}>
          {t("dash.ahead.now", { amount: money(start) })} · {tp("common.entries", upcoming.length)}
        </p>
      </SummaryPanel>

      <BalanceLine
        points={points}
        currency={base}
        caption={t("dash.ahead.caption")}
        dateLabel={t("common.date")}
        valueLabel={t("dash.ahead.balance")}
        changeLabel={t("dash.ahead.change")}
      />
    </Card>
  );
};

export default CashAheadCard;
