"use client";

import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";

import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";

import Icon from "../Icon/Icon";

import styles from "./OptionPicker.module.scss";

export interface PickerItem {
  value: string;
  label: string;
  icon?: ReactNode;
  hint?: string;
  child?: boolean;
}

export interface PickerGroup {
  label?: string;
  items: PickerItem[];
}

interface OptionPickerProps {
  value: string;
  onChange: (value: string) => void;
  groups: PickerGroup[];
  label?: string;
  placeholder?: string;
  size?: "sm" | "md";
  searchable?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

// Lists longer than this get a search field
const SEARCH_THRESHOLD = 8;

// Whether an item's label or hint contains the search text
const matches = (item: PickerItem, query: string): boolean => {
  if (query === "") return true;
  const needle = query.toLocaleLowerCase();
  return item.label.toLocaleLowerCase().includes(needle) || (item.hint ?? "").toLocaleLowerCase().includes(needle);
};

// A combobox opening a searchable listbox of grouped options, icons and hints
const OptionPicker = ({
  value,
  onChange,
  groups,
  label,
  placeholder,
  size = "md",
  searchable,
  disabled = false,
  id,
  className,
}: OptionPickerProps) => {
  const { t } = useI18n();
  const listId = useId();
  const ownId = useId();
  const buttonId = id ?? ownId;
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const all = groups.flatMap((group) => group.items);
  const visibleGroups = groups
    .map((group) => ({ ...group, items: group.items.filter((item) => matches(item, query)) }))
    .filter((group) => group.items.length > 0);
  const flat = visibleGroups.flatMap((group) => group.items);
  const selected = all.find((item) => item.value === value);
  const showSearch = searchable ?? all.length > SEARCH_THRESHOLD;

  // A press outside the picker closes it
  useEffect(() => {
    if (!open) return;
    // Closes the list when the press lands elsewhere
    const onPointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  // An open list takes the focus, in its search field when it has one
  useEffect(() => {
    if (!open) return;
    (showSearch ? searchRef.current : listRef.current)?.focus();
  }, [open, showSearch]);

  // The active option stays in view while the arrows move it
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelectorAll('[role="option"]')[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  // Opens the list on the chosen option
  const openMenu = () => {
    setActive(
      Math.max(
        0,
        all.findIndex((item) => item.value === value),
      ),
    );
    setOpen(true);
  };

  // Closes the list and forgets the search
  const close = () => {
    setOpen(false);
    setQuery("");
  };

  // Picks an option and closes the list
  const choose = (next: string) => {
    onChange(next);
    close();
  };

  // Arrows, Home and End move; Enter or Space picks; Escape closes
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (flat.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => (index + step + flat.length) % flat.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(Math.max(0, flat.length - 1));
    } else if (event.key === "Enter" || (event.key === " " && !showSearch)) {
      event.preventDefault();
      const item = flat[active];
      if (item) choose(item.value);
    }
  };

  return (
    <div ref={rootRef} className={cx(styles.picker, className)}>
      <button
        id={buttonId}
        type="button"
        role="combobox"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu();
          }
        }}
        className={cx(styles.button, styles[size])}
      >
        {selected?.icon !== undefined && <span className={styles.icon}>{selected.icon}</span>}
        <span className={cx(styles.value, !selected && styles.placeholder)}>
          {selected?.label ?? placeholder ?? label}
        </span>
        <span aria-hidden className={styles.chevron}>
          <Icon
            name="chevronDown"
            size={16}
            strokeWidth={2.4}
            className={cx(styles.chevronIcon, open && styles.chevronOpen)}
          />
        </span>
      </button>

      {open && (
        <div className={styles.popover}>
          {showSearch && (
            <div className={styles.searchRow}>
              <span aria-hidden className={styles.searchIcon}>
                <Icon name="search" size={14} />
              </span>
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder={t("filter.search")}
                aria-label={t("filter.search")}
                className={styles.search}
              />
            </div>
          )}
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-label={label}
            aria-labelledby={label ? undefined : buttonId}
            onKeyDown={onKeyDown}
            className={styles.list}
          >
            {flat.length === 0 && <li className={styles.empty}>{t("filter.noMatches")}</li>}
            {visibleGroups.map((group, groupIndex) => (
              <li key={group.label ?? groupIndex}>
                {group.label && <p className={styles.groupLabel}>{group.label}</p>}
                <ul role="group" aria-label={group.label}>
                  {group.items.map((item) => {
                    const index = flat.indexOf(item);
                    const isSelected = item.value === value;
                    return (
                      <li
                        key={item.value}
                        role="option"
                        aria-selected={isSelected}
                        data-value={item.value}
                        data-active={index === active}
                        onMouseEnter={() => setActive(index)}
                        onClick={(event) => {
                          // A field's label around the picker must not open it again
                          event.preventDefault();
                          choose(item.value);
                        }}
                        className={cx(
                          styles.option,
                          item.child && styles.child,
                          index === active && styles.activeOption,
                          isSelected && styles.selected,
                        )}
                      >
                        {item.icon !== undefined && (
                          <span aria-hidden className={styles.icon}>
                            {item.icon}
                          </span>
                        )}
                        <span className={styles.label}>{item.label}</span>
                        {item.hint && <span className={styles.hint}>{item.hint}</span>}
                        {isSelected && <Icon name="check" size={14} strokeWidth={2.6} className={styles.check} />}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default OptionPicker;
