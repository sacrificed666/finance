"use client";

import { useI18n } from "@/shared/i18n/useI18n";
import { currentMonth, monthNames, pad } from "@/shared/lib/date";

import Select from "../Select/Select";

import styles from "./MonthInput.module.scss";

interface MonthInputProps {
  value: string;
  onChange: (value: string) => void;
  name: string;
  allowEmpty?: boolean;
}

// The label of the empty choice in both selects
const EMPTY = "-";

// The year and month of a YYYY-MM value, or zeros for an empty one
const parts = (value: string, allowEmpty: boolean, now: readonly [number, number]): [number, number] => {
  const match = /^(\d{4})-(\d{2})$/u.exec(value);
  if (match) return [Number(match[1]), Number(match[2])];
  return allowEmpty ? [0, 0] : [now[0], now[1]];
};

// A month and a year picked from two selects; empty when allowed
const MonthInput = ({ value, onChange, name, allowEmpty = false }: MonthInputProps) => {
  const { t } = useI18n();
  const [nowYear = 0, nowMonth = 0] = currentMonth().split("-").map(Number);
  const [year, month] = parts(value, allowEmpty, [nowYear, nowMonth]);

  // Five years back and ten ahead, and always the chosen year
  const first = Math.min(nowYear - 5, year || nowYear);
  const last = Math.max(nowYear + 10, year || nowYear);
  const years = Array.from({ length: last - first + 1 }, (_, index) => first + index);

  // A new month in the chosen year, or empty
  const setMonth = (next: number) => onChange(next === 0 ? "" : `${String(year || nowYear)}-${pad(next)}`);
  // A new year with the chosen month, or empty
  const setYear = (next: number) => onChange(next === 0 ? "" : `${String(next)}-${pad(month || nowMonth)}`);

  return (
    <div className={styles.picker}>
      <Select
        aria-label={t("month.pickerMonth", { name })}
        value={String(month)}
        onChange={(event) => setMonth(Number(event.target.value))}
      >
        {allowEmpty && <option value="0">{EMPTY}</option>}
        {monthNames().map((label, index) => (
          <option key={label} value={index + 1}>
            {label}
          </option>
        ))}
      </Select>
      <Select
        aria-label={t("month.pickerYear", { name })}
        value={String(year)}
        onChange={(event) => setYear(Number(event.target.value))}
      >
        {allowEmpty && <option value="0">{EMPTY}</option>}
        {years.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    </div>
  );
};

export default MonthInput;
