"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import {
  initialReceivableForm,
  receivableFigures,
  receivableProblem,
  saveReceivable,
  type ReceivableForm,
} from "@/features/accounts/model/receivableForm";
import type { Receivable } from "@/features/data/model/types";
import { useI18n } from "@/shared/i18n/useI18n";
import { todayISO } from "@/shared/lib/date";
import { CURRENCY_SYMBOL } from "@/shared/lib/money";
import { uid } from "@/shared/lib/uid";
import Button from "@/shared/ui/Button/Button";
import DateField from "@/shared/ui/DateField/DateField";
import Field from "@/shared/ui/Field/Field";
import FormRow from "@/shared/ui/FormRow/FormRow";
import MoneyField from "@/shared/ui/MoneyField/MoneyField";
import Sheet from "@/shared/ui/Sheet/Sheet";
import TextInput from "@/shared/ui/TextInput/TextInput";

import styles from "./ReceivableSheet.module.scss";

interface ReceivableSheetProps {
  target: Receivable | "new";
  onClose: () => void;
  onDelete: (id: string) => void;
}

// Adds or edits money lent to someone, with what came back and when it is due
const ReceivableSheet = ({ target, onClose, onDelete }: ReceivableSheetProps) => {
  const { update } = useStore();
  const { t } = useI18n();
  const [form, setForm] = useState<ReceivableForm>(() => initialReceivableForm(target, todayISO()));
  const problem = receivableProblem(form);
  const { amount, repaid } = receivableFigures(form);
  const id = form.id;
  // Changes some fields of the form
  const change = (fields: Partial<ReceivableForm>) => setForm({ ...form, ...fields });

  // Keeps the loan
  const submit = () => {
    if (problem) return;
    update((s) => saveReceivable(s, form, uid));
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      onSubmit={submit}
      problem={problem && t(problem)}
      title={id ? t("receivables.edit") : t("receivables.new")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={problem !== null}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <Field label={t("receivables.name")}>
        <TextInput
          value={form.name}
          onChange={(event) => change({ name: event.target.value })}
          placeholder={t("common.example", { value: t("profile.displayName.placeholder") })}
          maxLength={80}
        />
      </Field>
      <MoneyField
        label={t("receivables.amount")}
        value={form.amount}
        onChange={(value) => change({ amount: value })}
        currency={form.currency}
        onCurrency={(currency) => change({ currency })}
        currencyLabel={t("common.currency")}
        hero
      />
      <Field label={t("receivables.repaid")} hint={t("common.optional")}>
        <TextInput
          inputMode="decimal"
          prefix={CURRENCY_SYMBOL[form.currency]}
          value={form.repaid}
          onChange={(event) => change({ repaid: event.target.value })}
          placeholder="0"
        />
      </Field>
      <FormRow>
        <Field label={t("receivables.date")}>
          <DateField value={form.date} onChange={(value) => change({ date: value })} />
        </Field>
        <Field label={t("receivables.due")} hint={t("common.optional")}>
          <DateField allowEmpty value={form.dueDate} onChange={(value) => change({ dueDate: value })} />
        </Field>
      </FormRow>
      <Field label={t("common.note")}>
        <TextInput
          value={form.note}
          onChange={(event) => change({ note: event.target.value })}
          placeholder={t("common.optional")}
        />
      </Field>
      {id && Number.isFinite(amount) && repaid < amount && (
        <Button variant="ghost" className={styles.wide} onClick={() => change({ repaid: form.amount })}>
          {t("receivables.repaidAll")}
        </Button>
      )}
      {id && (
        <Button variant="danger" className={styles.wide} onClick={() => onDelete(id)}>
          {t("receivables.delete")}
        </Button>
      )}
    </Sheet>
  );
};

export default ReceivableSheet;
