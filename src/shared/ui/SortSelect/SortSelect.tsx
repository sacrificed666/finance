"use client";

import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import type { SortDirection } from "@/shared/lib/listing";

import Icon from "../Icon/Icon";
import Select from "../Select/Select";

import styles from "./SortSelect.module.scss";

export interface SortOption<T extends string> {
  value: T;
  label: string;
}

interface SortSelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SortOption<T>[];
  direction: SortDirection;
  onDirectionChange: (direction: SortDirection) => void;
}

// What a list is sorted by, with a button that flips the direction
const SortSelect = <T extends string>({
  value,
  onChange,
  options,
  direction,
  onDirectionChange,
}: SortSelectProps<T>) => {
  const { t } = useI18n();
  const ascending = direction === "asc";
  const label = ascending ? t("filter.ascending") : t("filter.descending");
  return (
    <div className={styles.sort}>
      <div className={styles.select}>
        <Select
          size="sm"
          value={value}
          aria-label={t("filter.sortBy")}
          onChange={(event) => {
            const picked = options.find((option) => option.value === event.target.value);
            if (picked) onChange(picked.value);
          }}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      <button
        type="button"
        onClick={() => onDirectionChange(ascending ? "desc" : "asc")}
        aria-label={label}
        title={label}
        className={styles.direction}
      >
        <Icon name="sort" size={16} className={cx(styles.arrows, ascending && styles.flipped)} />
      </button>
    </div>
  );
};

export default SortSelect;
