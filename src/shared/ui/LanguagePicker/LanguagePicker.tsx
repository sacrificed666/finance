"use client";

import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";

import { type Locale, LOCALE_INFO, LOCALES } from "@/shared/i18n/locales";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";

import Flag from "../Flag/Flag";
import Icon from "../Icon/Icon";

import styles from "./LanguagePicker.module.scss";

interface LanguagePickerProps {
  value: Locale;
  onChange: (locale: Locale) => void;
  compact?: boolean;
}

// The position of a language in the list
const indexOf = (locale: Locale): number => Math.max(0, LOCALES.indexOf(locale));

// A button with the language's flag and name that opens a list of them all
const LanguagePicker = ({ value, onChange, compact = false }: LanguagePickerProps) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => indexOf(value));
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const current = LOCALE_INFO[value];
  const activeLocale = LOCALES[active] ?? value;

  // An open list takes the focus and closes on a click outside it
  useEffect(() => {
    if (!open) return;
    // Closes the list when the click lands elsewhere
    const onDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node) || !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    listRef.current?.focus();
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Picks a language, closes the list and gives the focus back to the button
  const choose = (locale: Locale) => {
    setOpen(false);
    buttonRef.current?.focus();
    if (locale !== value) onChange(locale);
  };

  // Opens the list on the current language
  const openList = () => {
    setActive(indexOf(value));
    setOpen(true);
  };

  // Arrows, Home and End move through the list; Enter or Space picks, Escape closes
  const onListKey = (event: KeyboardEvent<HTMLUListElement>) => {
    const last = LOCALES.length - 1;
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (!["Escape", "ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Escape") {
      setOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === "ArrowDown") {
      setActive((index) => (index + 1) % LOCALES.length);
    } else if (event.key === "ArrowUp") {
      setActive((index) => (index + last) % LOCALES.length);
    } else if (event.key === "Home") {
      setActive(0);
    } else if (event.key === "End") {
      setActive(last);
    } else {
      choose(activeLocale);
    }
  };

  return (
    <div ref={rootRef} className={cx(styles.picker, !compact && styles.full)}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${t("settings.language")}: ${current.name}`}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openList();
          }
        }}
        className={cx(styles.button, compact ? styles.compact : styles.large)}
      >
        <Flag country={current.flag} height={compact ? 14 : 16} />
        <span className={styles.name}>{current.name}</span>
        <span aria-hidden className={styles.chevron}>
          <Icon
            name="chevronDown"
            size={14}
            strokeWidth={2.4}
            className={cx(styles.turn, open && styles.chevronOpen)}
          />
        </span>
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label={t("settings.language")}
          aria-activedescendant={`${listId}-${activeLocale}`}
          onKeyDown={onListKey}
          className={styles.list}
        >
          {LOCALES.map((locale, index) => {
            const selected = locale === value;
            const info = LOCALE_INFO[locale];
            return (
              <li
                key={locale}
                id={`${listId}-${locale}`}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(locale)}
                className={cx(styles.option, index === active && styles.activeOption, selected && styles.selected)}
              >
                <Flag country={info.flag} height={15} />
                <span lang={locale} className={styles.name}>
                  {info.name}
                </span>
                {!selected && <span className={styles.english}>{info.english}</span>}
                {selected && <Icon name="check" size={14} strokeWidth={2.6} className={styles.check} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default LanguagePicker;
