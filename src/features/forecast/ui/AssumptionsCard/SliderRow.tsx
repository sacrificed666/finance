import type { ReactNode } from "react";

import styles from "./AssumptionsCard.module.scss";

interface SliderRowProps {
  label: string;
  value: string;
  hint?: string;
  children: ReactNode;
}

// A slider under its name and current value, with a hint below
const SliderRow = ({ label, value, hint, children }: SliderRowProps) => (
  <div>
    <div className={styles.sliderHead}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
    {children}
    {hint && <p className={styles.sliderHint}>{hint}</p>}
  </div>
);

export default SliderRow;
