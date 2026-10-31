import type { ReactNode } from "react";

import { cx } from "@/shared/lib/cx";

import styles from "./Badge.module.scss";

export type BadgeTone = "neutral" | "income" | "expense" | "warning" | "accent";

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
}

// A small tinted pill with text, so colour is never the only signal
const Badge = ({ children, tone = "neutral" }: BadgeProps) => (
  <span className={cx(styles.badge, styles[tone])}>{children}</span>
);

export default Badge;
