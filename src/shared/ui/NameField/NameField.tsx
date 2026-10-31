"use client";

import { useId, useState } from "react";

import OptionChips from "../OptionChips/OptionChips";
import TextInput from "../TextInput/TextInput";

import fieldStyles from "../Field/Field.module.scss";
import styles from "./NameField.module.scss";

interface IconChoice {
  value: string;
  options: readonly string[];
  onChange: (icon: string) => void;
  label: string;
}

interface NameFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
  icon?: IconChoice;
}

// A name with its emoji on a disc before it; the disc opens the emoji to pick from
const NameField = ({ label, value, onChange, placeholder, hint, maxLength, icon }: NameFieldProps) => {
  const id = useId();
  const grid = useId();
  const [picking, setPicking] = useState(false);
  return (
    <div className={fieldStyles.field}>
      <label htmlFor={id} className={fieldStyles.label}>
        {label}
      </label>
      <div className={styles.row}>
        {icon && (
          <button
            type="button"
            aria-label={icon.label}
            aria-expanded={picking}
            aria-controls={grid}
            onClick={() => setPicking(!picking)}
            className={styles.disc}
          >
            <span aria-hidden>{icon.value}</span>
          </button>
        )}
        <TextInput
          id={id}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {icon && picking && (
        <div id={grid} className={styles.grid}>
          <OptionChips
            label={icon.label}
            size="lg"
            options={icon.options.map((emoji) => ({ value: emoji, label: emoji }))}
            value={icon.value}
            onChange={(emoji) => {
              icon.onChange(emoji);
              setPicking(false);
            }}
          />
        </div>
      )}
      {hint && <span className={fieldStyles.hint}>{hint}</span>}
    </div>
  );
};

export default NameField;
