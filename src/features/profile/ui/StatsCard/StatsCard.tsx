"use client";

import { useStore } from "@/app/hooks";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import type { FinanceFacts } from "@/features/profile/model/achievements";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatMonth } from "@/shared/lib/date";
import { convert, formatMoney, formatPercent } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";
import Icon from "@/shared/ui/Icon/Icon";
import type { IconName } from "@/shared/ui/Icon/icons";

import styles from "./StatsCard.module.scss";

interface StatTile {
  icon: IconName;
  label: string;
  value: string;
  sub?: string;
}

interface StatsCardProps {
  facts: FinanceFacts;
}

// Tiles of the habits and figures behind the profile, once there is an entry
const StatsCard = ({ facts }: StatsCardProps) => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const category = useCategoryName();
  if (facts.monthsTracked === 0) return null;
  const base = state.settings.baseCurrency;
  // An amount kept in hryvnias, shown short in the base currency
  const money = (uah: number) => formatMoney(convert(uah, "UAH", base, state.settings.rates), base, { compact: true });
  const top = facts.topCategoryId ? state.categories.find((entry) => entry.id === facts.topCategoryId) : undefined;

  const tiles: StatTile[] = [
    {
      icon: "calendar",
      label: t("profile.stats.since"),
      value: facts.firstMonth ? formatMonth(facts.firstMonth) : "-",
      sub: tp("profile.stats.monthsValue", facts.monthsTracked),
    },
    {
      icon: "arrowDown",
      label: t("profile.stats.avgIncome"),
      value: money(facts.avgIncomeUAH),
      sub: tp("income.fullMonths", facts.avgIncomeMonths),
    },
    {
      icon: "spend",
      label: t("profile.stats.avgSpend"),
      value: money(facts.avgExpenseUAH),
      sub: tp("income.fullMonths", facts.avgExpenseMonths),
    },
    {
      icon: "pie",
      label: t("profile.stats.topCategory"),
      value: top ? `${top.icon} ${category(top)}` : "-",
      sub: top ? t("profile.stats.topShare", { pct: formatPercent(facts.topCategoryShare, 0) }) : undefined,
    },
    {
      icon: "banknote",
      label: t("profile.stats.passive"),
      value: `${money(facts.passiveMonthlyUAH)}${t("common.perMonth")}`,
      sub: t("profile.stats.passive.sub"),
    },
  ];

  return (
    <Card title={t("profile.stats.title")} subtitle={t("profile.stats.subtitle")} icon="chart">
      <dl className={styles.grid}>
        {tiles.map((tile) => (
          <div key={tile.label} className={styles.tile}>
            <dt className={styles.label}>
              <Icon name={tile.icon} size={13} className={styles.icon} />
              <span className={styles.labelText}>{tile.label}</span>
            </dt>
            <dd className={styles.value}>{tile.value}</dd>
            {tile.sub && <dd className={styles.sub}>{tile.sub}</dd>}
          </div>
        ))}
      </dl>
    </Card>
  );
};

export default StatsCard;
