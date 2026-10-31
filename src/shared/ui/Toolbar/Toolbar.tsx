import type { ReactNode } from "react";

import { cx } from "@/shared/lib/cx";

import styles from "./Toolbar.module.scss";

interface ToolbarProps {
  children: ReactNode;
  className?: string;
}

// A wrapping row of filters above a list; every child sets its own flex basis
const Toolbar = ({ children, className }: ToolbarProps) => (
  <div className={cx(styles.toolbar, className)}>{children}</div>
);

export default Toolbar;
