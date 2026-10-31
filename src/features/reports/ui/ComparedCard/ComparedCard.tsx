"use client";

import type { CategoryChange } from "@/features/reports/model/report";
import { useReportLabels } from "@/features/reports/model/useReportLabels";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatMoney, formatPercent, type Currency } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";
import EmptyState from "@/shared/ui/EmptyState/EmptyState";
import Icon from "@/shared/ui/Icon/Icon";
import LinkButton from "@/shared/ui/LinkButton/LinkButton";

import styles from "./ComparedCard.module.scss";

// The categories the table lists
const SHOWN = 12;

// The colour of a change: up is spending more
const changeTone = (entry: CategoryChange) => {
  const diff = entry.value - entry.before;
  if (diff > 0.5) return styles.up;
  return diff < -0.5 ? styles.down : styles.flat;
};

interface ComparedCardProps {
  changes: CategoryChange[];
  current: string;
  previous: string;
  currency: Currency;
  sameDay?: boolean;
}

// Each category's spending in both periods, with a bar and the change
const ComparedCard = ({ changes, current, previous, currency, sameDay = false }: ComparedCardProps) => {
  const { t } = useI18n();
  const { categoryMark } = useReportLabels();
  const largest = Math.max(1, ...changes.map((entry) => Math.max(entry.value, entry.before)));
  // A short amount in the base currency
  const money = (amount: number) => formatMoney(amount, currency, { compact: true });

  // The change as a percentage, "new" without a before, or a dash when flat
  const changeText = (entry: CategoryChange) => {
    const diff = entry.value - entry.before;
    if (Math.abs(diff) <= 0.5) return "-";
    if (entry.before <= 0) return t("reports.new");
    return `${diff > 0 ? "+" : "−"}${formatPercent(Math.abs((diff / entry.before) * 100), 0)}`;
  };

  return (
    <Card
      title={t("reports.compared")}
      subtitle={t(sameDay ? "reports.compared.subtitleToDate" : "reports.compared.subtitle", { period: previous })}
      icon="bars"
    >
      {changes.length === 0 ? (
        <EmptyState
          icon={<Icon name="bars" />}
          title={t("reports.empty")}
          hint={t("reports.empty.hint")}
          action={
            <LinkButton href="/transactions" variant="ghost">
              {t("dash.addExpense")}
            </LinkButton>
          }
        />
      ) : (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.categoryHead}>{t("common.category")}</th>
                <th className={styles.nowHead}>{current}</th>
                <th className={styles.before}>{previous}</th>
                <th className={styles.right}>{t("reports.change")}</th>
              </tr>
            </thead>
            <tbody>
              {changes.slice(0, SHOWN).map((entry) => {
                const { icon, name } = categoryMark(entry.id);
                return (
                  <tr key={entry.id}>
                    <td className={styles.categoryCell}>
                      <span className={styles.category}>
                        <span aria-hidden>{icon}</span>
                        <span className={styles.name}>{name}</span>
                      </span>
                    </td>
                    <td className={styles.right}>
                      <span className={styles.now}>
                        <span aria-hidden className={styles.bar}>
                          <span
                            className={styles.fill}
                            style={{ width: `${String((entry.value / largest) * 100)}%` }}
                          />
                        </span>
                        <span className={styles.value}>{money(entry.value)}</span>
                      </span>
                    </td>
                    <td className={styles.beforeValue}>{money(entry.before)}</td>
                    <td className={cx(styles.change, changeTone(entry))}>{changeText(entry)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

export default ComparedCard;
