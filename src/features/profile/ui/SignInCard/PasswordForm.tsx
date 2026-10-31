"use client";

import { useState } from "react";

import { passwordStrength } from "@/features/auth/model/passwordMeter";
import PasswordField from "@/features/auth/ui/PasswordField/PasswordField";
import { changePassword } from "@/features/profile/api/profile";
import { useI18n } from "@/shared/i18n/useI18n";
import Button from "@/shared/ui/Button/Button";
import Field from "@/shared/ui/Field/Field";

import styles from "./SignInCard.module.scss";

interface PasswordFormProps {
  hasPassword: boolean;
  onDone: () => void;
  onFailed: (message: string) => void;
  onCancel: () => void;
}

// Sets a first password, or changes the current one after typing it
const PasswordForm = ({ hasPassword, onDone, onFailed, onCancel }: PasswordFormProps) => {
  const { t, tk } = useI18n();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const mismatch = repeat.length > 0 && repeat !== next;
  const ready = passwordStrength(next).rules.length && next === repeat && (!hasPassword || current.length > 0);
  let label = t("profile.password.setButton");
  if (busy) label = t("common.saving");
  else if (hasPassword) label = t("profile.password.change");

  // Sends the passwords and reports what came of it
  const submit = async () => {
    setBusy(true);
    const answer = await changePassword(current, next);
    setBusy(false);
    if (answer.ok) onDone();
    else onFailed(tk(answer.error ?? "", t("profile.password.failed")));
  };

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        if (ready && !busy) void submit();
      }}
    >
      {hasPassword && (
        <Field label={t("profile.password.current")}>
          <PasswordField
            label={t("profile.password.current")}
            value={current}
            onChange={setCurrent}
            autoComplete="current-password"
          />
        </Field>
      )}
      <Field label={hasPassword ? t("profile.password.new") : t("profile.password.setNew")}>
        <PasswordField
          label={hasPassword ? t("profile.password.new") : t("profile.password.setNew")}
          value={next}
          onChange={setNext}
          meter
          autoComplete="new-password"
        />
      </Field>
      <Field label={t("profile.password.repeat")}>
        <PasswordField
          label={t("profile.password.repeat")}
          value={repeat}
          onChange={setRepeat}
          autoComplete="new-password"
        />
      </Field>
      {mismatch && <p className={styles.error}>{t("profile.password.mismatch")}</p>}
      <div className={styles.buttons}>
        <Button type="submit" disabled={busy || !ready}>
          {label}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
};

export default PasswordForm;
