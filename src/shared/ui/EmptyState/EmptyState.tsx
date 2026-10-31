import type { ReactNode } from "react";

import styles from "./EmptyState.module.scss";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}

// What a list says while it is empty, with a way to add the first record
const EmptyState = ({ icon, title, hint, action }: EmptyStateProps) => (
  <div className={styles.empty}>
    <span aria-hidden className={styles.mark}>
      {icon}
    </span>
    <p className={styles.title}>{title}</p>
    {hint && <p className={styles.hint}>{hint}</p>}
    {action && <div className={styles.action}>{action}</div>}
  </div>
);

export default EmptyState;
