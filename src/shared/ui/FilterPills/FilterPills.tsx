"use client";

import { useId } from "react";

import { cx } from "@/shared/lib/cx";

import styles from "./FilterPills.module.scss";

export interface PillOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface FilterPillsProps<T extends string> {
  options: PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

// Wrapping pills that filter a list, each with an optional count, as native radios
const FilterPills = <T extends string>({ options, value, onChange, label }: FilterPillsProps<T>) => {
  const name = useId();
  return (
    <fieldset className={styles.pills}>
      <legend className={styles.hidden}>{label}</legend>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <label key={option.value} className={cx(styles.pill, active ? styles.active : styles.idle)}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={active}
              onChange={() => onChange(option.value)}
              className={styles.hidden}
            />
            {option.label}
            {option.count !== undefined && <span className={styles.count}>{option.count}</span>}
          </label>
        );
      })}
    </fieldset>
  );
};

export default FilterPills;
