import { cx } from "@/shared/lib/cx";

import { ICON_PATHS, type IconName } from "./icons";

import styles from "./Icon.module.scss";

interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

// A line icon in the current text colour, hidden from screen readers
const Icon = ({ name, size = 18, strokeWidth = 1.8, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className={cx(styles.icon, className)}
  >
    {ICON_PATHS[name].map((path) => (
      <path key={path} d={path} />
    ))}
  </svg>
);

export default Icon;
