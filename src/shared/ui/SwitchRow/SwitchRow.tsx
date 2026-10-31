import type { ReactNode } from "react";

import { cx } from "@/shared/lib/cx";

import Switch from "../Switch/Switch";

import styles from "./SwitchRow.module.scss";

interface SwitchRowProps {
  title: string;
  hint?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

// A switch beside its name and what it changes, the same in every card and sheet
const SwitchRow = ({ title, hint, checked, onChange, className }: SwitchRowProps) => (
  <div className={cx(styles.row, className)}>
    <div className={styles.text}>
      <p className={styles.title}>{title}</p>
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
    <Switch checked={checked} onChange={onChange} label={title} />
  </div>
);

export default SwitchRow;
