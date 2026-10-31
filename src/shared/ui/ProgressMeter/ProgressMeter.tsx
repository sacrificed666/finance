import { cx } from "@/shared/lib/cx";

import styles from "./ProgressMeter.module.scss";

interface ProgressMeterProps {
  value: number;
  max: number;
  tone?: "accent" | "budget" | "expense";
  label?: string;
}

// The fill colour of a budget: amber close to the limit, red past it
const budgetTone = (ratio: number): "over" | "close" | "fine" => {
  if (ratio > 1) return "over";
  if (ratio > 0.85) return "close";
  return "fine";
};

// A thin bar that fills up to a share of its maximum, a native meter underneath
const ProgressMeter = ({ value, max, tone = "accent", label }: ProgressMeterProps) => {
  const ratio = max > 0 ? value / max : 0;
  const clamped = Math.min(1, Math.max(0, ratio));
  let fill = styles.fine;
  if (tone === "budget") fill = styles[budgetTone(ratio)];
  else if (tone === "expense") fill = styles.over;
  return (
    <span className={styles.track}>
      <span aria-hidden="true" className={cx(styles.fill, fill)} style={{ width: `${String(clamped * 100)}%` }} />
      <meter aria-label={label} min={0} max={100} value={Math.round(clamped * 100)} className={styles.value} />
    </span>
  );
};

export default ProgressMeter;
