import { cx } from "@/shared/lib/cx";
import Icon from "@/shared/ui/Icon/Icon";
import type { IconName } from "@/shared/ui/Icon/icons";

import styles from "./CategoriesCard.module.scss";

interface IconActionProps {
  label: string;
  reason?: string | null;
  icon: IconName;
  danger?: boolean;
  onClick: () => void;
}

// A round icon button, turned off with the reason when it cannot be used
const IconAction = ({ label, reason, icon, danger = false, onClick }: IconActionProps) => (
  <button
    type="button"
    aria-label={reason ? `${label}: ${reason}` : label}
    title={reason ?? label}
    onClick={onClick}
    disabled={Boolean(reason)}
    className={cx(styles.action, danger && styles.danger)}
  >
    <Icon name={icon} size={17} strokeWidth={1.9} />
  </button>
);

export default IconAction;
