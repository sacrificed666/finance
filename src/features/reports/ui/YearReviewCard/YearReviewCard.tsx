"use client";

import { yearReview, type Report } from "@/features/reports/model/report";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatMonthShort } from "@/shared/lib/date";
import { formatMoney, type Currency } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";

import styles from "./YearReviewCard.module.scss";

interface YearReviewCardProps {
  year: Report["year"];
  period: string;
  currency: Currency;
}

// The year's best and toughest months and how many ended in the plus
const YearReviewCard = ({ year, period, currency }: YearReviewCardProps) => {
  const { t } = useI18n();
  const review = yearReview(year);
  if (!review) return null;
  const { best, worst } = review;
  // A short signed amount in the base currency
  const money = (amount: number) => formatMoney(amount, currency, { compact: true, sign: true });
  return (
    <Card title={t("reports.review")} subtitle={period} icon="star">
      <div className={styles.tiles}>
        <div className={styles.tile}>
          <p className={styles.caption}>{t("reports.bestMonth")}</p>
          <p className={styles.best}>{money(best.net)}</p>
          <p className={styles.caption}>{formatMonthShort(best.month)}</p>
        </div>
        <div className={styles.tile}>
          <p className={styles.caption}>{t("reports.worstMonth")}</p>
          <p className={worst.net < 0 ? styles.worst : styles.even}>{money(worst.net)}</p>
          <p className={styles.caption}>{formatMonthShort(worst.month)}</p>
        </div>
      </div>
      <p className={styles.summary}>{t("reports.inThePlus", { n: review.inThePlus, total: review.months })}</p>
    </Card>
  );
};

export default YearReviewCard;
