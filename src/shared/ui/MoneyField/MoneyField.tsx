"use client";

import { useId } from "react";

import { cx } from "@/shared/lib/cx";
import {
  CURRENCIES,
  CURRENCY_SYMBOL,
  currencyOptions,
  formatMoney,
  isSum,
  parseAmount,
  type Currency,
} from "@/shared/lib/money";

import SegmentedControl from "../SegmentedControl/SegmentedControl";
import TextInput from "../TextInput/TextInput";

import fieldStyles from "../Field/Field.module.scss";
import styles from "./MoneyField.module.scss";

interface MoneyFieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  currency: Currency;
  onCurrency: (currency: Currency) => void;
  currencyLabel: string;
  currencies?: readonly Currency[];
  hero?: boolean;
}

// An amount with its currency signs beside it; a sum such as 120+45 is worked out
const MoneyField = ({
  label,
  hint,
  value,
  onChange,
  currency,
  onCurrency,
  currencyLabel,
  currencies = CURRENCIES,
  hero = false,
}: MoneyFieldProps) => {
  const id = useId();
  const sum = isSum(value) ? parseAmount(value) : Number.NaN;
  const worked = Number.isFinite(sum);
  // Puts the worked-out sum in place of the sum typed once the field is left
  const settle = () => {
    if (worked) onChange(String(Math.round(sum * 100) / 100));
  };
  const result = worked && (
    <p className={styles.sum} aria-live="polite">
      = {formatMoney(sum, currency)}
    </p>
  );
  const signs =
    currencies.length > 1 ? (
      <SegmentedControl<Currency>
        label={currencyLabel}
        options={currencyOptions(currencies)}
        size={hero ? "sm" : "md"}
        fit
        value={currency}
        onChange={onCurrency}
        className={styles.currency}
      />
    ) : null;
  if (hero) {
    return (
      <div className={cx(fieldStyles.field, styles.hero)}>
        <div className={styles.heroHead}>
          <label htmlFor={id} className={styles.heroLabel}>
            {label}
          </label>
          {signs}
        </div>
        <div className={styles.heroRow}>
          <span aria-hidden className={styles.heroSign}>
            {CURRENCY_SYMBOL[currency]}
          </span>
          <input
            id={id}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onBlur={settle}
            className={styles.heroInput}
          />
        </div>
        {result}
        {hint && <p className={fieldStyles.hint}>{hint}</p>}
      </div>
    );
  }
  return (
    <div className={fieldStyles.field}>
      <label htmlFor={id} className={fieldStyles.label}>
        {label}
      </label>
      <div className={styles.row}>
        <TextInput
          id={id}
          inputMode="decimal"
          placeholder="0"
          prefix={CURRENCY_SYMBOL[currency]}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={settle}
        />
        {signs}
      </div>
      {result}
      {hint && <p className={fieldStyles.hint}>{hint}</p>}
    </div>
  );
};

export default MoneyField;
