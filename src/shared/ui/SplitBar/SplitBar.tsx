import { cx } from "@/shared/lib/cx";

import styles from "./SplitBar.module.scss";

export interface SplitBarPart {
  id: string;
  value: number;
  color: string;
  title: string;
}

interface SplitBarProps {
  parts: SplitBarPart[];
  label: string;
  className?: string;
}

// A rounded bar split into coloured parts by share, each sliding in after the last
const SplitBar = ({ parts, label, className }: SplitBarProps) => {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  return (
    <figure className={cx(styles.bar, className)} aria-label={label}>
      {parts.map((part, index) => (
        <div
          key={part.id}
          className={styles.part}
          title={part.title}
          style={{ width: `${String((part.value / total) * 100)}%`, background: part.color, "--i": index }}
        />
      ))}
    </figure>
  );
};

export default SplitBar;
