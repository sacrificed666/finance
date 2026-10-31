"use client";

import { useId } from "react";

import { cx } from "@/shared/lib/cx";

import styles from "./OptionChips.module.scss";

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  title?: string;
}

interface OptionChipsProps<T extends string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "md" | "lg";
}

// A grid of round chips, such as emoji or colours, one chosen with native radios
const OptionChips = <T extends string>({ options, value, onChange, label, size = "md" }: OptionChipsProps<T>) => {
  const name = useId();
  return (
    <fieldset
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${size === "lg" ? "2.5rem" : "2rem"}, 1fr))` }}
      className={styles.grid}
    >
      <legend className={styles.hidden}>{label}</legend>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <label
            key={option.value}
            title={option.title}
            className={cx(styles.chip, styles[size], active ? styles.active : styles.idle)}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={active}
              aria-label={option.title ?? option.label}
              onChange={() => onChange(option.value)}
              className={styles.hidden}
            />
            {option.label}
          </label>
        );
      })}
    </fieldset>
  );
};

export default OptionChips;
