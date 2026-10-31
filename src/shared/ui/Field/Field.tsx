import type { ReactNode } from "react";

import styles from "./Field.module.scss";

interface FieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
}

// A label wrapped around one control, with a hint under it
const Field = ({ label, children, hint }: FieldProps) => (
  <label className={styles.field}>
    <span className={styles.label}>{label}</span>
    {children}
    {hint && <span className={styles.hint}>{hint}</span>}
  </label>
);

export default Field;
