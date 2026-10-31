"use client";

import { useI18n } from "@/shared/i18n/useI18n";
import Icon from "@/shared/ui/Icon/Icon";

import styles from "./ReportsHero.module.scss";

interface PeriodStepperProps {
  label: string;
  atLatest: boolean;
  onStep: (direction: 1 | -1) => void;
}

// Buttons to the period before and after, with the chosen one between them
const PeriodStepper = ({ label, atLatest, onStep }: PeriodStepperProps) => {
  const { t } = useI18n();
  return (
    <div className={styles.stepper}>
      <button type="button" aria-label={t("month.previous")} onClick={() => onStep(-1)} className={styles.step}>
        <Icon name="chevronLeft" size={18} strokeWidth={2.2} />
      </button>
      <span className={styles.period}>{label}</span>
      <button
        type="button"
        aria-label={t("month.next")}
        onClick={() => onStep(1)}
        disabled={atLatest}
        className={styles.step}
      >
        <Icon name="chevronRight" size={18} strokeWidth={2.2} />
      </button>
    </div>
  );
};

export default PeriodStepper;
