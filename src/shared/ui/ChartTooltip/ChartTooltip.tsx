import type { ReactNode } from "react";

import styles from "./ChartTooltip.module.scss";

interface ChartTooltipProps {
  x: number;
  y: number;
  containerWidth: number;
  children: ReactNode;
}

// How close to the right edge the tooltip switches to the left of the pointer
const FLIP_MARGIN = 132;

// A small card beside the pointer over a chart, kept inside the chart's width
const ChartTooltip = ({ x, y, containerWidth, children }: ChartTooltipProps) => {
  const flip = x > containerWidth - FLIP_MARGIN;
  return (
    <div
      className={styles.tooltip}
      style={{
        left: flip ? undefined : x + 10,
        right: flip ? containerWidth - x + 10 : undefined,
        top: Math.max(0, y - 6),
      }}
    >
      {children}
    </div>
  );
};

export default ChartTooltip;
