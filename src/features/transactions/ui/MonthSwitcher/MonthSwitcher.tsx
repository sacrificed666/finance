"use client";

import { PLANNING_HORIZON_MONTHS } from "@/features/transactions/model/schedules";
import { useI18n } from "@/shared/i18n/useI18n";
import { addMonths, currentMonth, formatMonth, monthDiff } from "@/shared/lib/date";
import Button from "@/shared/ui/Button/Button";
import Icon from "@/shared/ui/Icon/Icon";

import styles from "./MonthSwitcher.module.scss";

interface MonthSwitcherProps {
  month: string;
  onChange: (month: string) => void;
}

// Steps through the months as far as plans reach, and back to this month
const MonthSwitcher = ({ month, onChange }: MonthSwitcherProps) => {
  const { t } = useI18n();
  const thisMonth = currentMonth();
  const canGoNext = monthDiff(thisMonth, month) < PLANNING_HORIZON_MONTHS - 1;
  return (
    <div className={styles.switcher}>
      <button
        type="button"
        aria-label={t("month.previous")}
        onClick={() => onChange(addMonths(month, -1))}
        className={styles.arrow}
      >
        <Icon name="chevronLeft" size={18} strokeWidth={2.2} />
      </button>
      <span className={styles.month}>
        <span className={styles.name}>{formatMonth(month)}</span>
        {month === thisMonth && <span className={styles.current}>{t("month.this")}</span>}
      </span>
      {month !== thisMonth && (
        <Button variant="ghost" size="sm" className={styles.today} onClick={() => onChange(thisMonth)}>
          {t("month.today")}
        </Button>
      )}
      <button
        type="button"
        aria-label={t("month.next")}
        onClick={() => onChange(addMonths(month, 1))}
        disabled={!canGoNext}
        className={styles.arrow}
      >
        <Icon name="chevronRight" size={18} strokeWidth={2.2} />
      </button>
    </div>
  );
};

export default MonthSwitcher;
