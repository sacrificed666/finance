"use client";

import { yearlyRows, type Forecast } from "@/features/forecast/model/forecast";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatMoney } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";

import styles from "./YearlyTableCard.module.scss";

interface YearlyTableCardProps {
  f: Forecast;
  withDebts: boolean;
}

// The projection year by year: savings, investments, debts, total and growth
const YearlyTableCard = ({ f, withDebts }: YearlyTableCardProps) => {
  const { t } = useI18n();
  const showDebts = withDebts && f.state.debts.length > 0;
  // A short amount in the shown currency
  const money = (amount: number, sign = false) => formatMoney(amount, f.view, { compact: true, sign });

  return (
    <Card title={t("forecast.yearly", { currency: f.view })} icon="calendar">
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.left}>{t("forecast.col.year")}</th>
              <th className={styles.wide}>{t("forecast.savings")}</th>
              <th className={styles.wide}>{t("balance.investments")}</th>
              {showDebts && <th className={styles.wide}>{t("balance.debts")}</th>}
              <th className={styles.totalHead}>{t("forecast.col.total")}</th>
              <th className={styles.right}>{t("forecast.col.added")}</th>
            </tr>
          </thead>
          <tbody>
            {yearlyRows(f).map((row) => (
              <tr key={row.month}>
                <td>
                  <span className={row.index === 0 ? styles.now : styles.year}>
                    {row.index === 0 ? t("forecast.now") : row.month.slice(0, 4)}
                  </span>
                </td>
                <td className={styles.figure}>{money(row.savings)}</td>
                <td className={styles.figure}>{money(row.investments)}</td>
                {showDebts && <td className={styles.debt}>{row.debt > 0 ? `−${money(row.debt)}` : "-"}</td>}
                <td className={styles.right}>
                  <span className={styles.total}>
                    <span aria-hidden className={styles.bar}>
                      <span className={styles.fill} style={{ width: `${String(row.share)}%` }} />
                    </span>
                    <span className={styles.net}>{money(row.net)}</span>
                  </span>
                </td>
                <td className={cx(styles.added, row.added !== null && row.added > 0 ? styles.grew : styles.flat)}>
                  {row.added === null ? "-" : money(row.added, true)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.hint}>{t("forecast.yearly.hint")}</p>
    </Card>
  );
};

export default YearlyTableCard;
