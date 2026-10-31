import type { ReactNode } from "react";

import { cx } from "@/shared/lib/cx";
import Icon from "@/shared/ui/Icon/Icon";
import { SUBJECT_SLOT, type IconName } from "@/shared/ui/Icon/icons";
import IconDisc from "@/shared/ui/IconDisc/IconDisc";

import styles from "./DataCard.module.scss";

interface DataRowProps {
  icon: IconName;
  title: string;
  caption: string;
  action: ReactNode;
  danger?: boolean;
}

// One thing to do with the data: its icon, what it does and its button
const DataRow = ({ icon, title, caption, action, danger = false }: DataRowProps) => (
  <div className={cx(styles.row, danger ? styles.dangerRow : styles.plainRow)}>
    {danger ? (
      <span aria-hidden className={styles.dangerIcon}>
        <Icon name={icon} size={16} />
      </span>
    ) : (
      <IconDisc colorSlot={SUBJECT_SLOT[icon]} size="lg">
        <Icon name={icon} size={16} />
      </IconDisc>
    )}
    <div className={styles.text}>
      <p className={cx(styles.title, danger && styles.dangerTitle)}>{title}</p>
      <p className={styles.caption}>{caption}</p>
    </div>
    {action}
  </div>
);

export default DataRow;
