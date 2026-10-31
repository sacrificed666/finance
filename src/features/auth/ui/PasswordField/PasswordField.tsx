"use client";

import { type InputHTMLAttributes, useState } from "react";

import { passwordStrength, STRENGTH_COLOR } from "@/features/auth/model/passwordMeter";
import { useI18n } from "@/shared/i18n/useI18n";
import Icon from "@/shared/ui/Icon/Icon";
import TextInput from "@/shared/ui/TextInput/TextInput";

import styles from "./PasswordField.module.scss";

interface PasswordFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "size" | "prefix"
> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  meter?: boolean;
}

// The four bars of the strength meter
const BARS = [1, 2, 3, 4] as const;

// The rules a weak password is reminded of
const RULES = ["length", "mix", "symbol"] as const;

// A password field with a show button and, for new ones, a strength meter
const PasswordField = ({ label, value, onChange, meter, ...props }: PasswordFieldProps) => {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const strength = passwordStrength(value);
  const color = STRENGTH_COLOR[strength.level];

  return (
    <div>
      <div className={styles.field}>
        <TextInput
          {...props}
          aria-label={label}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={styles.input}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? t("profile.password.hide") : t("profile.password.show")}
          className={styles.toggle}
        >
          <Icon name={visible ? "monitor" : "lock"} size={16} />
        </button>
      </div>
      {meter && value.length > 0 && (
        <div className={styles.meter}>
          <div className={styles.bars} aria-hidden>
            {BARS.map((bar) => (
              <span
                key={bar}
                className={styles.bar}
                style={bar <= Math.max(1, strength.score) ? { background: color } : undefined}
              />
            ))}
          </div>
          <p className={styles.verdict}>
            <span className={styles.level} style={{ color }}>
              {t(`profile.password.strength.${strength.level}`)}
            </span>
            {RULES.filter((rule) => !strength.rules[rule]).map((rule) => (
              <span key={rule} className={styles.rule}>
                {t(`profile.password.rule.${rule}`)}
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
};

export default PasswordField;
