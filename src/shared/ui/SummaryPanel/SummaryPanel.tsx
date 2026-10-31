import type { ReactNode } from "react";

import { cx } from "@/shared/lib/cx";

import styles from "./SummaryPanel.module.scss";

interface SummaryPanelProps {
  value: ReactNode;
  tone?: "income" | "expense";
  meta?: ReactNode;
  children?: ReactNode;
  className?: string;
}

// The top of a list card: its figure, what it is measured against, a meter or note
const SummaryPanel = ({ value, tone, meta, children, className }: SummaryPanelProps) => (
  <div className={cx(styles.panel, className)}>
    <div className={styles.head}>
      <p className={cx(styles.value, tone ? styles[tone] : styles.plain)}>{value}</p>
      {meta && <p className={styles.meta}>{meta}</p>}
    </div>
    {children && <div className={styles.body}>{children}</div>}
  </div>
);

export default SummaryPanel;
