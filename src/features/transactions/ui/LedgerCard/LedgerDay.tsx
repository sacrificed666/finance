"use client";

import type { ReactNode } from "react";

import { useStore } from "@/app/hooks";
import type { Transaction } from "@/features/data/model/types";
import { netOf } from "@/features/transactions/model/ledger";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatDate, formatDateShort, formatWeekday } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";

import styles from "./LedgerCard.module.scss";

interface LedgerDayProps {
  day: string;
  entries: readonly Transaction[];
  spanning: boolean;
  today: string;
  children: ReactNode;
}

// One day's entries under its date and their net; days to come are dimmed
const LedgerDay = ({ day, entries, spanning, today, children }: LedgerDayProps) => {
  const { state } = useStore();
  const { t } = useI18n();
  const planned = day > today;
  const net = netOf(state, entries);
  return (
    <section className={cx(planned && styles.planned)}>
      <h3 className={styles.dayHead}>
        <span className={styles.dayTitle}>
          <span>
            <span className={styles.weekday}>{formatWeekday(day)}</span>
            <span className={styles.date}>, {spanning ? formatDate(day) : formatDateShort(day)}</span>
          </span>
          {planned && <span className={styles.plannedBadge}>{t("tx.planned")}</span>}
        </span>
        {entries.length > 1 && (
          <span className={cx(styles.dayNet, net >= 0 ? styles.positive : styles.negative)}>
            {formatMoney(net, state.settings.baseCurrency, { compact: true, sign: true })}
          </span>
        )}
      </h3>
      <div className={styles.dayRows}>{children}</div>
    </section>
  );
};

export default LedgerDay;
