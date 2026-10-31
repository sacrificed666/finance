import type { ReactNode } from "react";

import styles from "./FieldSet.module.scss";

interface FieldSetProps {
  label: string;
  children: ReactNode;
  hint?: string;
}

// A label above a group of controls that name themselves, such as radio groups
const FieldSet = ({ label, children, hint }: FieldSetProps) => (
  <div className={styles.field}>
    <span className={styles.label}>{label}</span>
    {children}
    {hint && <span className={styles.hint}>{hint}</span>}
  </div>
);

export default FieldSet;
