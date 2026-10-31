import { cx } from "@/shared/lib/cx";
import type { PageTone } from "@/shared/lib/navigation";

import Icon from "../Icon/Icon";
import type { IconName } from "../Icon/icons";

import styles from "./ToneMark.module.scss";

interface ToneMarkProps {
  icon: IconName;
  tone: PageTone;
  size?: "sm" | "lg";
  className?: string;
}

// A page's icon in ink on its pastel disc, small in menus, large in grids
const ToneMark = ({ icon, tone, size = "sm", className }: ToneMarkProps) => (
  <span aria-hidden className={cx(styles.mark, styles[size], className)} data-tone={tone}>
    <Icon name={icon} size={size === "lg" ? 24 : 16} strokeWidth={2.2} />
  </span>
);

export default ToneMark;
