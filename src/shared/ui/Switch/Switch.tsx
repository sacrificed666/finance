import { cx } from "@/shared/lib/cx";

import styles from "./Switch.module.scss";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

// An on/off switch whose hit area reaches past the track
const Switch = ({ checked, onChange, label }: SwitchProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={cx(styles.switch, checked ? styles.on : styles.off)}
  >
    <span className={styles.knob} />
  </button>
);

export default Switch;
