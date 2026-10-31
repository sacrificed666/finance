"use client";

import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";

import Icon from "../Icon/Icon";

import styles from "./SearchInput.module.scss";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// A search field that fills a toolbar's free width, with a button that clears it
const SearchInput = ({ value, onChange, placeholder, className }: SearchInputProps) => {
  const { t } = useI18n();
  const label = placeholder ?? t("filter.search");
  return (
    <div className={cx(styles.search, className)}>
      <span aria-hidden className={styles.icon}>
        <Icon name="search" size={15} />
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
        aria-label={label}
        className={styles.input}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t("filter.clearSearch")}
          className={styles.clear}
        >
          <Icon name="close" size={13} strokeWidth={2.4} />
        </button>
      )}
    </div>
  );
};

export default SearchInput;
