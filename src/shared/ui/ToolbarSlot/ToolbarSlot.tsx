import type { ReactNode } from "react";

import { cx } from "@/shared/lib/cx";

import styles from "./ToolbarSlot.module.scss";

interface ToolbarSlotProps {
  children: ReactNode;
  className?: string;
}

// A place for a select in a toolbar: 10rem wide, shrinking and growing with it
const ToolbarSlot = ({ children, className }: ToolbarSlotProps) => (
  <div className={cx(styles.slot, className)}>{children}</div>
);

export default ToolbarSlot;
