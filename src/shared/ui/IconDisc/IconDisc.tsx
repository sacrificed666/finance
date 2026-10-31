import type { CSSProperties, ReactNode } from "react";

import { cx } from "@/shared/lib/cx";

import styles from "./IconDisc.module.scss";

export type IconDiscSize = "sm" | "md" | "lg";

interface IconDiscProps {
  colorSlot?: number;
  size?: IconDiscSize;
  className?: string;
  children: ReactNode;
}

// A disc in one series colour: a tint lit from the top left, a thin edge, its ink
const tinted = (slot: number): CSSProperties => {
  const series = `var(--series-${String(slot)})`;
  return {
    background: `radial-gradient(circle at 30% 25%, color-mix(in oklab, ${series} 28%, transparent), color-mix(in oklab, ${series} 11%, transparent) 72%)`,
    boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${series} 22%, transparent)`,
    color: `color-mix(in oklab, ${series} 76%, var(--color-text))`,
  };
};

// A round disc behind an icon or emoji, tinted by a series colour or glass
const IconDisc = ({ colorSlot, size, className, children }: IconDiscProps) => (
  <span
    aria-hidden
    className={cx(styles.disc, size && styles[size], !colorSlot && styles.glass, className)}
    style={colorSlot ? tinted(colorSlot) : undefined}
  >
    {children}
  </span>
);

export default IconDisc;
