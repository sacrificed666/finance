import type { CSSProperties } from "react";

import { cx } from "@/shared/lib/cx";

import ChartTable from "../ChartTable/ChartTable";

import styles from "./BarRow.module.scss";

export interface Bar {
  key: string;
  label: string;
  value: number;
  display: string;
  strong?: boolean;
}

interface BarRowProps {
  bars: Bar[];
  caption: string;
  columns: [string, string];
  tone?: "income" | "expense";
  height?: number;
}

// Columns side by side with their figure on top; one below the line is negative
const BarRow = ({ bars, caption, columns, tone = "income", height = 150 }: BarRowProps) => {
  const top = Math.max(0, ...bars.map((bar) => bar.value));
  const bottom = Math.max(0, ...bars.map((bar) => -bar.value));
  const span = Math.max(1, top + bottom);
  const plot: CSSProperties = { height, "--above": `${String((top / span) * 100)}%` };
  return (
    <div>
      <ChartTable
        caption={caption}
        columns={columns}
        rows={bars.map((bar) => ({ key: bar.key, cells: [bar.label, bar.display] }))}
      />
      <div aria-hidden className={styles.plot} style={plot}>
        {bars.map((bar, index) => {
          const share = `${String((Math.abs(bar.value) / span) * 100)}%`;
          return (
            <div key={bar.key} title={`${bar.label}: ${bar.display}`} className={styles.column}>
              <span className={styles.figure}>{bar.display}</span>
              <div className={styles.track}>
                <span
                  className={cx(
                    styles.bar,
                    bar.value < 0 ? styles.below : styles[tone],
                    !bar.strong && bars.some((other) => other.strong) && styles.quiet,
                  )}
                  style={{ "--size": share, "--i": index, top: bar.value < 0 ? "var(--above)" : undefined }}
                />
              </div>
              <span className={cx(styles.label, bar.strong && styles.strongLabel)}>{bar.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BarRow;
