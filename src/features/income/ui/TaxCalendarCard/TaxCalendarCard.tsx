"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import { taxRegime } from "@/features/income/model/tax";
import { hasTaxCalendar, upcomingObligations, type TaxObligation } from "@/features/income/model/taxCalendar";
import { usePeriodLabel } from "@/features/income/model/usePeriodLabel";
import TaxPaidSheet from "@/features/income/ui/TaxPaidSheet/TaxPaidSheet";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { daysBetween, formatDateShort, todayISO } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";
import Icon from "@/shared/ui/Icon/Icon";
import SummaryPanel from "@/shared/ui/SummaryPanel/SummaryPanel";

import styles from "./TaxCalendarCard.module.scss";

// The next tax payments and filings, summed up, each to mark paid
const TaxCalendarCard = () => {
  const { state } = useStore();
  const { t, tp, tk } = useI18n();
  const periodLabel = usePeriodLabel();
  const today = todayISO();
  const [paying, setPaying] = useState<TaxObligation | null>(null);
  const regime = state.settings.tax.regime;
  if (!hasTaxCalendar(regime)) return null;

  const items = upcomingObligations(state, today, 6);
  const payments = items.filter((item) => item.amount !== undefined);
  const first = items[0];
  // The name of an obligation with its period
  const name = (item: TaxObligation) => t(`taxcal.${item.kind}`, { period: periodLabel(item.period) });
  // When an obligation is due: overdue, today, or on a day in some days
  const when = (item: TaxObligation) => {
    const days = daysBetween(today, item.due);
    if (days < 0) return t("taxcal.overdue", { date: formatDateShort(item.due) });
    if (days === 0) return t("taxcal.today");
    return `${formatDateShort(item.due)} · ${tp("taxcal.inDays", days)}`;
  };

  return (
    <Card title={t("taxcal.title")} subtitle={tk(taxRegime(regime).labelKey, regime)} icon="receipt">
      {first ? (
        <SummaryPanel
          className={styles.summary}
          value={formatMoney(
            payments.reduce((sum, item) => sum + (item.amount ?? 0), 0),
            "UAH",
          )}
          tone={daysBetween(today, first.due) < 0 ? "expense" : undefined}
          meta={tp("taxcal.payments", payments.length)}
        >
          <p className={styles.caption}>{t("taxcal.next", { when: when(first) })}</p>
        </SummaryPanel>
      ) : (
        <p className={cx(styles.caption, styles.summary)}>{t("taxcal.allSet")}</p>
      )}
      <ul className={styles.rows}>
        {items.map((item) => (
          <li key={item.id} className={styles.row}>
            <span className={styles.body}>
              <span className={styles.name}>{name(item)}</span>
              <span className={cx(styles.when, daysBetween(today, item.due) < 0 && styles.late)}>{when(item)}</span>
            </span>
            {item.amount !== undefined && (
              <span className={styles.amount}>{formatMoney(item.amount, "UAH", { compact: true })}</span>
            )}
            <button
              type="button"
              onClick={() => setPaying(item)}
              aria-label={t("taxcal.markPaid")}
              title={t("taxcal.markPaid")}
              className={styles.pay}
            >
              <Icon name="check" size={14} strokeWidth={2.4} />
            </button>
          </li>
        ))}
      </ul>
      <p className={cx(styles.caption, styles.note)}>{t("taxcal.note")}</p>
      {paying && <TaxPaidSheet obligations={[paying]} onClose={() => setPaying(null)} />}
    </Card>
  );
};

export default TaxCalendarCard;
