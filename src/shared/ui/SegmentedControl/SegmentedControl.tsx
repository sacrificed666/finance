"use client";

import { useId } from "react";

import { cx } from "@/shared/lib/cx";

import styles from "./SegmentedControl.module.scss";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  title?: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  fit?: boolean;
  label?: string;
  className?: string;
}

// Equal segments, a sliding thumb: across a form, or fit to its words
const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  size = "md",
  fit = size === "sm",
  label,
  className,
}: SegmentedControlProps<T>) => {
  const name = useId();
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const pad = size === "sm" ? "0.1875rem" : "0.25rem";
  const count = String(options.length);
  return (
    <fieldset className={cx(styles.group, className)}>
      {label && <legend className={styles.hidden}>{label}</legend>}
      <div
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
        className={cx(styles.track, styles[size], fit && styles.fit)}
      >
        <span
          aria-hidden
          className={styles.thumb}
          style={{
            width: `calc((100% - ${pad} * 2) / ${count})`,
            left: `calc(${pad} + ${String(index)} * (100% - ${pad} * 2) / ${count})`,
          }}
        />
        {options.map((option) => {
          const active = option.value === value;
          return (
            <label key={option.value} title={option.title} className={cx(styles.segment, active && styles.active)}>
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={active}
                aria-label={option.title}
                onChange={() => onChange(option.value)}
                className={styles.hidden}
              />
              <span className={styles.text}>{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};

export default SegmentedControl;
