"use client";

import type { ReactNode } from "react";

import { useI18n } from "@/shared/i18n/useI18n";
import { type BreakdownSegment, seriesColor } from "@/shared/lib/chart";
import { type Currency, formatMoney } from "@/shared/lib/money";

import Icon from "../Icon/Icon";
import SplitBar from "../SplitBar/SplitBar";

import styles from "./CategoryBreakdown.module.scss";

interface CategoryBreakdownProps {
  segments: BreakdownSegment[];
  currency: Currency;
  maxSegments?: number;
  rowExtra?: (id: string) => ReactNode;
}

// The id of the part that gathers everything past the shown ones
const OTHER = "__other";

// The colour of a part; one without a colour, such as the gathered rest, is grey
const colorOf = (segment: BreakdownSegment) =>
  segment.colorSlot === 0 ? "var(--color-text-tertiary)" : seriesColor(segment.colorSlot);

// A split bar with the largest parts listed under it; the rest is one grey part
const CategoryBreakdown = ({ segments, currency, maxSegments = 6, rowExtra }: CategoryBreakdownProps) => {
  const { t } = useI18n();
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const restValue = segments.slice(maxSegments).reduce((sum, segment) => sum + segment.value, 0);
  const shown = segments.slice(0, maxSegments);
  const bars: BreakdownSegment[] =
    restValue > 0
      ? [
          ...shown,
          {
            id: OTHER,
            label: t("chart.other"),
            icon: <Icon name="ellipsis" size={14} strokeWidth={3} />,
            value: restValue,
            colorSlot: 0,
          },
        ]
      : shown;

  if (total <= 0) return null;

  // A part's amount in short form
  const amount = (segment: BreakdownSegment) => formatMoney(segment.value, currency, { compact: true });

  return (
    <div>
      <SplitBar
        label={t("chart.breakdownAria")}
        parts={bars.map((segment) => ({
          id: segment.id,
          value: segment.value,
          color: colorOf(segment),
          title: `${segment.label}: ${amount(segment)}`,
        }))}
      />
      <ul className={styles.list}>
        {bars.map((segment) => (
          <li key={segment.id}>
            <div className={styles.row}>
              <span aria-hidden className={styles.dot} style={{ background: colorOf(segment) }} />
              <span aria-hidden className={styles.icon}>
                {segment.icon}
              </span>
              <span className={styles.name}>{segment.label}</span>
              <span className={styles.share}>{((segment.value / total) * 100).toFixed(0)}%</span>
              <span className={styles.amount}>{amount(segment)}</span>
            </div>
            {rowExtra?.(segment.id)}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CategoryBreakdown;
