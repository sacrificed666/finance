"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import { activeAccounts } from "@/features/accounts/model/accounts";
import { deleteGoal, goalProblem, initialGoalForm, saveGoal, type GoalForm } from "@/features/accounts/model/goals";
import { ICON_CHOICES } from "@/features/data/model/defaults";
import type { Goal } from "@/features/data/model/types";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { CURRENCY_SYMBOL } from "@/shared/lib/money";
import { uid } from "@/shared/lib/uid";
import Button from "@/shared/ui/Button/Button";
import ConfirmDialog from "@/shared/ui/ConfirmDialog/ConfirmDialog";
import DateField from "@/shared/ui/DateField/DateField";
import Field from "@/shared/ui/Field/Field";
import FieldSet from "@/shared/ui/FieldSet/FieldSet";
import FormRow from "@/shared/ui/FormRow/FormRow";
import MoneyField from "@/shared/ui/MoneyField/MoneyField";
import NameField from "@/shared/ui/NameField/NameField";
import Sheet from "@/shared/ui/Sheet/Sheet";
import TextInput from "@/shared/ui/TextInput/TextInput";

import styles from "./GoalSheet.module.scss";

interface GoalSheetProps {
  target: Goal | "new";
  onClose: () => void;
}

// Adds or edits a goal: what for, how much, by when, and the money that counts
const GoalSheet = ({ target, onClose }: GoalSheetProps) => {
  const { state, update } = useStore();
  const { t } = useI18n();
  const [form, setForm] = useState<GoalForm>(() => initialGoalForm(target, state.settings.baseCurrency));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const problem = goalProblem(form);
  const accounts = state.savings.filter(
    (account) => activeAccounts([account]).length > 0 || form.accountIds.includes(account.id),
  );
  // Changes some fields of the form
  const change = (fields: Partial<GoalForm>) => setForm({ ...form, ...fields });
  // Counts an account towards the goal, or stops counting it
  const toggleAccount = (id: string) =>
    change({
      accountIds: form.accountIds.includes(id)
        ? form.accountIds.filter((item) => item !== id)
        : [...form.accountIds, id],
    });

  // Keeps the goal
  const save = () => {
    if (problem) return;
    update((s) => saveGoal(s, form, uid));
    onClose();
  };

  // Removes the goal, with an undo
  const remove = () => {
    const id = form.id;
    if (!id) return;
    update((s) => deleteGoal(s, id), t("goals.deleted"));
    onClose();
  };

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        onSubmit={save}
        problem={problem && t(problem)}
        title={form.id ? t("goals.edit") : t("goals.new")}
        footer={
          <>
            {form.id && (
              <Button variant="danger" className={styles.delete} onClick={() => setConfirmDelete(true)}>
                {t("common.delete")}
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={problem !== null}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <MoneyField
          label={t("goals.target")}
          value={form.target}
          onChange={(value) => change({ target: value })}
          currency={form.currency}
          onCurrency={(currency) => change({ currency })}
          currencyLabel={t("common.currency")}
          hero
        />
        <NameField
          label={t("goals.name")}
          value={form.name}
          onChange={(name) => change({ name })}
          placeholder={t("common.example", { value: t("goals.namePlaceholder") })}
          maxLength={80}
          icon={{
            value: form.icon,
            options: ICON_CHOICES,
            onChange: (icon) => change({ icon }),
            label: t("common.icon"),
          }}
        />
        <FormRow>
          <Field label={t("goals.saved")} hint={t("goals.saved.hint")}>
            <TextInput
              inputMode="decimal"
              prefix={CURRENCY_SYMBOL[form.currency]}
              value={form.saved}
              onChange={(event) => change({ saved: event.target.value })}
              placeholder="0"
            />
          </Field>
          <Field label={t("goals.deadline")} hint={t("common.optional")}>
            <DateField allowEmpty value={form.deadline} onChange={(deadline) => change({ deadline })} />
          </Field>
        </FormRow>
        {accounts.length > 0 && (
          <FieldSet label={t("goals.accounts")} hint={t("goals.accounts.hint")}>
            <div className={styles.accounts}>
              {accounts.map((account) => {
                const on = form.accountIds.includes(account.id);
                return (
                  <button
                    key={account.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleAccount(account.id)}
                    className={cx(styles.account, on && styles.accountOn)}
                  >
                    {account.icon} {account.name}
                  </button>
                );
              })}
            </div>
          </FieldSet>
        )}
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title={t("goals.deleteTitle")}
        message={t("goals.deleteMessage")}
      />
    </>
  );
};

export default GoalSheet;
