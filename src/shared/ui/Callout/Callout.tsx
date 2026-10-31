import type { ReactNode } from "react";

import { cx } from "@/shared/lib/cx";

import Icon from "../Icon/Icon";
import type { IconName } from "../Icon/icons";

import styles from "./Callout.module.scss";

export type CalloutTone = "info" | "warning" | "success" | "danger" | "tip";

interface CalloutProps {
  tone?: CalloutTone;
  title?: string;
  children?: ReactNode;
  className?: string;
}

// The icon of each tone
const ICONS: Record<CalloutTone, IconName> = {
  info: "info",
  tip: "sparkle",
  success: "check",
  warning: "warning",
  danger: "warning",
};

// A tinted note inside a card; warnings and dangers are announced as alerts
const Callout = ({ tone = "info", title, children, className }: CalloutProps) => (
  <div
    role={tone === "danger" || tone === "warning" ? "alert" : "note"}
    className={cx(styles.callout, styles[tone], className)}
  >
    <Icon name={ICONS[tone]} size={17} className={styles.icon} />
    <div className={styles.content}>
      {title && <p className={styles.title}>{title}</p>}
      {children && <div className={styles.body}>{children}</div>}
    </div>
  </div>
);

export default Callout;
