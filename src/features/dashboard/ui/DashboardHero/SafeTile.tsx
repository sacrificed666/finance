"use client";

import type { SafeToSpend } from "@/features/dashboard/model/safeToSpend";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatMoney, type Currency } from "@/shared/lib/money";
import CountUp from "@/shared/ui/CountUp/CountUp";
import LinkButton from "@/shared/ui/LinkButton/LinkButton";
import SubjectMark from "@/shared/ui/SubjectMark/SubjectMark";

import styles from "./DashboardHero.module.scss";

interface SafeTileProps {
  safe: SafeToSpend | null;
  base: Currency;
}

// How a day of the strip looks: gone by, today or still to come
const dayState = (day: number, today: number, spent: number) => {
  if (day === today) return styles.today;
  if (day > today) return styles.ahead;
  return spent > 0 ? styles.spent : undefined;
};

// What the budgets, or else the month's income, leave a day, over the month's days
const SafeTile = ({ safe, base }: SafeTileProps) => {
  const { t, tp } = useI18n();
  if (!safe) {
    return (
      <section className={styles.side}>
        <h2 className={styles.sideLabel}>
          <SubjectMark icon="target" />
          {t("dash.safe.title")}
        </h2>
        <p className={styles.sideHint}>{t("dash.safe.empty")}</p>
        <div className={styles.sideAction}>
          <LinkButton href="/transactions" variant="ghost">
            {t("dash.safe.setBudget")}
          </LinkButton>
        </div>
      </section>
    );
  }
  const peak = Math.max(1, ...safe.spentByDay);
  const days = safe.spentByDay.map((spent, index) => ({ day: index + 1, spent }));
  return (
    <section className={styles.side}>
      <h2 className={styles.sideLabel}>
        <SubjectMark icon="target" />
        {t("dash.safe.title")}
      </h2>
      <p className={styles.safe}>
        <CountUp value={safe.perDay} format={(amount) => formatMoney(amount, base)} />
      </p>
      <p className={styles.sideHint}>
        {`${t(safe.source === "plan" ? "dash.safe.leftPlan" : "dash.safe.left", {
          amount: formatMoney(safe.left, base, { compact: true }),
        })}, ${tp("dash.safe.days", safe.days)}`}
      </p>
      <ol aria-hidden className={styles.days}>
        {days.map(({ day, spent }) => (
          <li
            key={day}
            className={cx(styles.day, dayState(day, safe.day, spent))}
            style={{ "--level": Math.sqrt(spent / peak).toFixed(2), "--i": day - 1 }}
          />
        ))}
      </ol>
      <p aria-hidden className={styles.legend}>
        <span className={styles.legendSpent}>{t("dash.safe.spent")}</span>
        <span className={styles.legendToday}>{t("dash.safe.today")}</span>
        <span className={styles.legendAhead}>{t("dash.safe.ahead")}</span>
      </p>
    </section>
  );
};

export default SafeTile;
