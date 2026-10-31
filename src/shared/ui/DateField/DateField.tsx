"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import {
  addMonths,
  formatDate,
  formatDateNumeric,
  formatMonth,
  formatWeekday,
  pad,
  parseDateInput,
  todayISO,
} from "@/shared/lib/date";

import Icon from "../Icon/Icon";

import styles from "./DateField.module.scss";

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  allowEmpty?: boolean;
  id?: string;
  "aria-label"?: string;
}

// A Monday-to-Sunday week, for the names of the weekdays
const WEEK = Array.from({ length: 7 }, (_, index) => `2024-01-0${String(index + 1)}`);

// The days of a month as dates, after the blanks before its first Monday
const monthDays = (month: string) => {
  const [year = 2026, number = 1] = month.split("-").map(Number);
  const offset = (new Date(Date.UTC(year, number - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return { offset, days: Array.from({ length: count }, (_, index) => `${month}-${pad(index + 1)}`) };
};

// The gap between the field and its month, and the room kept from the edges
const GAP = 6;
const EDGE = 12;

// Where the month goes on screen: under the field, or over it without room below
const placeOf = (field: DOMRect, panel: { width: number; height: number }) => {
  const below = field.bottom + GAP;
  const fitsBelow = below + panel.height <= window.innerHeight - EDGE;
  const top = fitsBelow || field.top - GAP - panel.height < EDGE ? below : field.top - GAP - panel.height;
  const left = Math.min(Math.max(EDGE, field.left), window.innerWidth - panel.width - EDGE);
  return { top, left };
};

// A date typed in numbers, with a month to pick it from beside it
const DateField = ({ value, onChange, min, max, allowEmpty = false, id, "aria-label": ariaLabel }: DateFieldProps) => {
  const { t } = useI18n();
  const today = todayISO();
  const panel = useId();
  const root = useRef<HTMLDivElement>(null);
  const pane = useRef<HTMLDialogElement>(null);
  const [place, setPlace] = useState<CSSProperties>({ top: 0, left: 0 });
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState((value || today).slice(0, 7));
  // Whether a day falls before the first or after the last allowed
  const outside = (date: string) => (min !== undefined && date < min) || (max !== undefined && date > max);
  const { offset, days } = monthDays(month);

  // A press outside the field or Escape closes the month
  useEffect(() => {
    if (!open) return;
    // Closes unless the press landed inside
    const onPress = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !root.current?.contains(event.target)) setOpen(false);
    };
    // Closes on Escape
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPress);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPress);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Keeps the month beside the field while the page or the sheet scrolls under it
  useLayoutEffect(() => {
    if (!open) return;
    // Places the month by the field's box on the screen
    const follow = () => {
      const field = root.current?.getBoundingClientRect();
      const box = pane.current;
      if (!field || !box) return;
      // A sheet around the field may hold the pane, so its corner is taken off
      const now = box.getBoundingClientRect();
      const originTop = now.top - (Number.parseFloat(box.style.top) || 0);
      const originLeft = now.left - (Number.parseFloat(box.style.left) || 0);
      const want = placeOf(field, { width: box.offsetWidth, height: box.offsetHeight });
      setPlace({ top: want.top - originTop, left: want.left - originLeft });
    };
    follow();
    // A month with a sixth week grows the pane, so it is placed again
    const grows = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(follow);
    if (pane.current) grows?.observe(pane.current);
    window.addEventListener("resize", follow);
    window.addEventListener("scroll", follow, true);
    return () => {
      grows?.disconnect();
      window.removeEventListener("resize", follow);
      window.removeEventListener("scroll", follow, true);
    };
  }, [open]);

  // Takes a typed date once it is a real day, or an empty one where that is allowed
  const type = (text: string) => {
    setDraft(text);
    if (text.trim() === "" && allowEmpty) onChange("");
    const date = parseDateInput(text);
    if (date) onChange(date);
  };
  // Picks a day from the month and closes it
  const pick = (date: string) => {
    onChange(date);
    setDraft(null);
    setOpen(false);
  };

  return (
    <div ref={root} className={styles.field}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={ariaLabel}
        value={draft ?? (value ? formatDateNumeric(value) : "")}
        placeholder={t("common.example", { value: formatDateNumeric(today) })}
        onChange={(event) => type(event.target.value)}
        onBlur={() => setDraft(null)}
        className={styles.input}
      />
      <button
        type="button"
        aria-label={t("date.pick")}
        aria-expanded={open}
        aria-controls={open ? panel : undefined}
        onClick={() => {
          setMonth((value || today).slice(0, 7));
          setOpen(!open);
        }}
        className={styles.toggle}
      >
        <Icon name="calendar" size={16} />
      </button>
      {open && (
        <dialog ref={pane} open id={panel} aria-label={formatMonth(month)} style={place} className={styles.panel}>
          <div className={styles.head}>
            <button
              type="button"
              aria-label={t("month.previous")}
              onClick={() => setMonth(addMonths(month, -1))}
              className={styles.step}
            >
              <Icon name="chevronLeft" size={16} />
            </button>
            <span className={styles.month}>{formatMonth(month)}</span>
            <button
              type="button"
              aria-label={t("month.next")}
              onClick={() => setMonth(addMonths(month, 1))}
              className={styles.step}
            >
              <Icon name="chevronRight" size={16} />
            </button>
          </div>
          <div className={styles.grid}>
            {WEEK.map((date) => (
              <span key={date} aria-hidden className={styles.weekday}>
                {formatWeekday(date)}
              </span>
            ))}
            {Array.from({ length: offset }, (_, index) => (
              <span key={`blank-${String(index)}`} aria-hidden />
            ))}
            {days.map((date) => (
              <button
                key={date}
                type="button"
                aria-label={formatDate(date)}
                aria-pressed={date === value}
                disabled={outside(date)}
                onClick={() => pick(date)}
                className={cx(styles.day, date === value && styles.chosen, date === today && styles.today)}
              >
                {Number(date.slice(8))}
              </button>
            ))}
          </div>
          <div className={styles.foot}>
            {!outside(today) && (
              <button type="button" onClick={() => pick(today)} className={styles.quick}>
                {t("calendar.today")}
              </button>
            )}
            {allowEmpty && value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className={styles.quick}
              >
                {t("date.clear")}
              </button>
            )}
          </div>
        </dialog>
      )}
    </div>
  );
};

export default DateField;
