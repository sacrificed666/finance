import type { ReactNode } from "react";

import { cx } from "@/shared/lib/cx";

import styles from "./FormRow.module.scss";

interface FormRowProps {
  children: ReactNode;
  wide?: "first" | "last";
}

// Short fields side by side from small tablets up, the same in every form
const FormRow = ({ children, wide }: FormRowProps) => (
  <div className={cx(styles.row, wide === "first" && styles.first, wide === "last" && styles.last)}>{children}</div>
);

export default FormRow;
