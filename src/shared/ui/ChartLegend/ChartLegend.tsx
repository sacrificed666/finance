import { cx } from "@/shared/lib/cx";

import styles from "./ChartLegend.module.scss";

export interface LegendItem {
  label: string;
  color: string;
  kind?: "line" | "rect";
}

// The series of a chart, each with a line or a square in its colour
const ChartLegend = ({ items }: { items: LegendItem[] }) => (
  <div className={styles.legend}>
    {items.map((item) => (
      <span key={item.label} className={styles.item}>
        <span
          aria-hidden
          className={cx(item.kind === "line" ? styles.line : styles.rect)}
          style={{ background: item.color }}
        />
        {item.label}
      </span>
    ))}
  </div>
);

export default ChartLegend;
