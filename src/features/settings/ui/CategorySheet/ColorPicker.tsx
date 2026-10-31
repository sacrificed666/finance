"use client";

import { useId } from "react";

import { useI18n } from "@/shared/i18n/useI18n";
import Icon from "@/shared/ui/Icon/Icon";

import styles from "./CategorySheet.module.scss";

// The series colours a category can take
const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

interface ColorPickerProps {
  value: number;
  onChange: (slot: number) => void;
}

// Round swatches of the series colours, one radio button each
const ColorPicker = ({ value, onChange }: ColorPickerProps) => {
  const { t } = useI18n();
  const name = useId();
  return (
    <fieldset className={styles.colorSet}>
      <legend className={styles.hidden}>{t("common.color")}</legend>
      <div className={styles.colors}>
        {SLOTS.map((slot) => (
          <label key={slot} className={styles.swatch} style={{ backgroundColor: `var(--series-${String(slot)})` }}>
            <input
              type="radio"
              name={name}
              value={slot}
              checked={value === slot}
              onChange={() => onChange(slot)}
              aria-label={t("settings.categories.colorN", { n: slot })}
              className={styles.hidden}
            />
            {value === slot && <Icon name="check" size={14} strokeWidth={3.2} />}
          </label>
        ))}
      </div>
    </fieldset>
  );
};

export default ColorPicker;
