"use client";

import { useId } from "react";

import { useMeasure } from "@/shared/hooks/useMeasure";
import { TONE_COLOR, type Tone } from "@/shared/lib/chart";

import styles from "./SparkArea.module.scss";

interface SparkAreaProps {
  values: number[];
  tone: Tone;
  height: number;
  fill?: boolean;
  fromZero?: boolean;
}

// A trend line over a fading area, as tall as asked or as its box when it fills it
const SparkArea = ({ values, tone, height: least, fill = false, fromZero = false }: SparkAreaProps) => {
  const [ref, width, boxHeight] = useMeasure<HTMLDivElement>();
  const height = fill ? Math.max(least, boxHeight) : least;
  const gradientId = `spark-${useId().replaceAll(/[^a-zA-Z0-9]/gu, "")}`;
  const color = TONE_COLOR[tone];
  // Flows keep zero in sight, so a small month never looks like an empty one
  const min = fromZero ? Math.min(0, ...values) : Math.min(...values);
  const span = Math.max(fromZero ? 0 : -Infinity, ...values) - min || 1;
  // The horizontal position of a point
  const px = (index: number) => (index / (values.length - 1)) * width;
  // The vertical position of a value
  const py = (value: number) => height - 3 - ((value - min) / span) * (height - 8);
  const line = values
    .map((value, index) => `${index === 0 ? "M" : "L"}${px(index).toFixed(1)},${py(value).toFixed(1)}`)
    .join("");
  return (
    <div ref={ref} aria-hidden className={styles.area} style={fill ? { top: 0 } : { height }}>
      {width > 0 && values.length > 1 && (
        <svg width={width} height={height} className={styles.svg}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path
            d={`${line}L${String(width)},${String(height)}L0,${String(height)}Z`}
            fill={`url(#${gradientId})`}
            className={styles.fill}
          />
          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.85}
            className={styles.line}
            style={{ "--len": width * 2 }}
          />
        </svg>
      )}
    </div>
  );
};

export default SparkArea;
