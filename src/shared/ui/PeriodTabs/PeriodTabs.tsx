"use client";

import { useI18n } from "@/shared/i18n/useI18n";
import { CHART_PERIODS } from "@/shared/lib/chart";

import SegmentedControl from "../SegmentedControl/SegmentedControl";

import styles from "./PeriodTabs.module.scss";

interface PeriodTabsProps {
  value: number;
  onChange: (months: number) => void;
  options?: readonly { months: number; label: string }[];
}

// How many months a chart shows, as a small segmented control
const PeriodTabs = ({ value, onChange, options = CHART_PERIODS }: PeriodTabsProps) => {
  const { t, tk } = useI18n();
  return (
    <SegmentedControl
      size="sm"
      label={t("chart.period")}
      className={styles.tabs}
      options={options.map((period) => ({ value: String(period.months), label: tk(period.label, period.label) }))}
      value={String(value)}
      onChange={(months) => onChange(Number(months))}
    />
  );
};

export default PeriodTabs;
