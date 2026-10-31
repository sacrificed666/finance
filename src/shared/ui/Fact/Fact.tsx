import type { ReactNode } from "react";

import { cx } from "@/shared/lib/cx";

import styles from "./Fact.module.scss";

interface FactProps {
  label: string;
  children: ReactNode;
  wide?: boolean;
}

// One fact as a small tile; a wide one takes the whole row
const Fact = ({ label, children, wide = false }: FactProps) => (
  <div className={cx(styles.fact, wide && styles.wide)}>
    <dt className={styles.label}>{label}</dt>
    <dd className={styles.value}>{children}</dd>
  </div>
);

export default Fact;
