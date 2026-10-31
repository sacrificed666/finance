"use client";

import Link from "next/link";

import type { MonthFigures } from "@/features/dashboard/model/summary";
import { savingsRate } from "@/features/dashboard/model/summary";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { monthNames } from "@/shared/lib/date";
import { formatMoney, formatPercent, type Currency } from "@/shared/lib/money";
import SubjectMark from "@/shared/ui/SubjectMark/SubjectMark";

import styles from "./DashboardHero.module.scss";

interface MonthTileProps {
  current: MonthFigures;
  base: Currency;
}

// This month so far as three bars: what came in, what went out and the share kept
const MonthTile = ({ current, base }: MonthTileProps) => {
  const { t } = useI18n();
  const scale = Math.max(current.income, current.expense, 1);
  const rate = current.income > 0 ? savingsRate(current) : 0;
  const name = monthNames()[Number(current.month.slice(5)) - 1] ?? current.month;
  // A short amount in the base currency
  const money = (amount: number) => formatMoney(amount, base, { compact: true });
  return (
    <section className={styles.side}>
      <h2 className={styles.sideLabel}>
        <SubjectMark icon="calendar" />
        {t("dash.month.soFar", { month: name })}
      </h2>
      <ul className={styles.flows}>
        <li>
          <Link href="/income" className={styles.flow}>
            <span className={styles.flowName}>{t("dash.month.in")}</span>
            <span className={styles.bar}>
              <span
                className={styles.barIn}
                style={{ width: `${String((current.income / scale) * 100)}%`, "--i": 0 }}
              />
            </span>
            <span className={styles.flowValue}>{money(current.income)}</span>
          </Link>
        </li>
        <li>
          <Link href="/transactions" className={styles.flow}>
            <span className={styles.flowName}>{t("dash.month.out")}</span>
            <span className={styles.bar}>
              <span
                className={styles.barOut}
                style={{ width: `${String((current.expense / scale) * 100)}%`, "--i": 1 }}
              />
            </span>
            <span className={styles.flowValue}>{money(current.expense)}</span>
          </Link>
        </li>
        <li className={styles.flow}>
          <span className={styles.flowName}>{t("dash.month.kept")}</span>
          <span className={styles.bar}>
            <span
              className={styles.barKept}
              style={{ width: `${String(Math.max(0, Math.min(100, rate)))}%`, "--i": 2 }}
            />
          </span>
          <span className={cx(styles.flowValue, rate > 0 && styles.up, rate < 0 && styles.down)}>
            {current.income > 0 ? formatPercent(rate) : "-"}
          </span>
        </li>
      </ul>
    </section>
  );
};

export default MonthTile;
