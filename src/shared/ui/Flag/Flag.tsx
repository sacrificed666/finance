import { cx } from "@/shared/lib/cx";

import styles from "./Flag.module.scss";

interface FlagProps {
  country: string;
  height?: number;
  label?: string;
  className?: string;
}

// A country flag served by the app, named only when no text says the country
const Flag = ({ country, height = 16, label, className }: FlagProps) => (
  <img
    className={cx(styles.flag, className)}
    src={`/flags/${country}`}
    width={Math.round((height * 3) / 2)}
    height={height}
    alt={label ?? ""}
    title={label}
    loading="lazy"
    decoding="async"
    draggable={false}
  />
);

export default Flag;
