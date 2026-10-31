import type { ReactNode } from "react";

import { type BreakdownSegment, seriesColor } from "@/shared/lib/chart";
import { cx } from "@/shared/lib/cx";
import { type Currency, formatMoney, formatPercent } from "@/shared/lib/money";

import HeroHeading from "../HeroHeading/HeroHeading";
import SplitBar from "../SplitBar/SplitBar";

import styles from "./HeroSplit.module.scss";

// The colour square of a part in the legend
const dot = (segment: BreakdownSegment, size: "small" | "large") => (
  <span aria-hidden className={cx(styles.dot, styles[size])} style={{ background: seriesColor(segment.colorSlot) }} />
);

interface HeroSplitProps {
  title: string;
  summary?: ReactNode;
  segments: BreakdownSegment[];
  currency: Currency;
  columns?: 2 | 3;
}

// The right half of a hero: a split bar with a legend of every part's share
const HeroSplit = ({ title, summary, segments, currency, columns = 2 }: HeroSplitProps) => {
  const shown = segments.filter((segment) => segment.value > 0);
  const total = shown.reduce((sum, segment) => sum + segment.value, 0);
  if (total <= 0) return null;
  // A part's share of the whole
  const share = (segment: BreakdownSegment) => formatPercent((segment.value / total) * 100, 0);
  // A part's amount in short form
  const amount = (segment: BreakdownSegment) => formatMoney(segment.value, currency, { compact: true });

  return (
    <div>
      <HeroHeading title={title} summary={summary} />
      <SplitBar
        label={title}
        className={styles.bar}
        parts={shown.map((segment) => ({
          id: segment.id,
          value: segment.value,
          color: seriesColor(segment.colorSlot),
          title: `${segment.label}: ${amount(segment)}`,
        }))}
      />
      {columns === 3 ? (
        <ul className={styles.three}>
          {shown.map((segment) => (
            <li key={segment.id} className={styles.cell}>
              <p className={styles.cellLabel}>
                {dot(segment, "small")}
                <span className={styles.cellName}>{segment.label}</span>
              </p>
              <p className={styles.cellFigures}>
                <span className={styles.cellAmount}>{amount(segment)}</span>{" "}
                <span className={styles.cellShare}>{share(segment)}</span>
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <ul className={styles.two}>
          {shown.map((segment) => (
            <li key={segment.id} className={styles.row}>
              {dot(segment, "large")}
              {segment.icon && (
                <span aria-hidden className={styles.icon}>
                  {segment.icon}
                </span>
              )}
              <span className={styles.name}>{segment.label}</span>
              <span className={styles.share}>{share(segment)}</span>
              <span className={styles.amount}>{amount(segment)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default HeroSplit;
