"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import { debtProblem, initialDebtForm, saveDebt, type DebtForm } from "@/features/accounts/model/debtForm";
import { DEBT_KINDS } from "@/features/accounts/model/kinds";
import type { Debt, DebtKind } from "@/features/data/model/types";
import { useI18n } from "@/shared/i18n/useI18n";
import { CURRENCY_SYMBOL } from "@/shared/lib/money";
import { uid } from "@/shared/lib/uid";
import Button from "@/shared/ui/Button/Button";
import Field from "@/shared/ui/Field/Field";
import FieldSet from "@/shared/ui/FieldSet/FieldSet";
import FormRow from "@/shared/ui/FormRow/FormRow";
import MoneyField from "@/shared/ui/MoneyField/MoneyField";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";
import Sheet from "@/shared/ui/Sheet/Sheet";
import TextInput from "@/shared/ui/TextInput/TextInput";

import styles from "./DebtSheet.module.scss";

interface DebtSheetProps {
  target: Debt | "new";
  onClose: () => void;
  onDelete: (id: string) => void;
}

// Adds or edits a mortgage, a loan or a card debt with its rate and payment
const DebtSheet = ({ target, onClose, onDelete }: DebtSheetProps) => {
  const { update } = useStore();
  const { t } = useI18n();
  const [form, setForm] = useState<DebtForm>(() => initialDebtForm(target));
  const problem = debtProblem(form);
  const id = form.id;
  // Changes some fields of the form
  const change = (fields: Partial<DebtForm>) => setForm({ ...form, ...fields });

  // Keeps the debt
  const submit = () => {
    if (problem) return;
    update((s) => saveDebt(s, form, uid));
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      onSubmit={submit}
      problem={problem && t(problem)}
      title={id ? t("balance.debt.edit") : t("balance.debt.new")}
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
      <FieldSet label={t("balance.debt.type")}>
        <SegmentedControl<DebtKind>
          label={t("balance.debt.type")}
          options={DEBT_KINDS.map((kind) => ({ value: kind, label: t(`debtKind.${kind}`) }))}
          value={form.kind}
          onChange={(kind) => change({ kind })}
        />
      </FieldSet>
      <Field label={t("common.name")}>
        <TextInput
          value={form.name}
          onChange={(event) => change({ name: event.target.value })}
          placeholder={t("common.example", { value: t("balance.debt.namePlaceholder") })}
        />
      </Field>
      <MoneyField
        label={t("balance.debt.outstanding")}
        hint={t("balance.debt.outstanding.hint")}
        value={form.balance}
        onChange={(balance) => change({ balance })}
        currency={form.currency}
        onCurrency={(currency) => change({ currency })}
        currencyLabel={t("common.currency")}
        hero
      />
      <Field label={t("balance.debt.original")} hint={t("balance.debt.original.hint")}>
        <TextInput
          inputMode="decimal"
          prefix={CURRENCY_SYMBOL[form.currency]}
          value={form.principal}
          onChange={(event) => change({ principal: event.target.value })}
          placeholder="0"
        />
      </Field>
      <FormRow>
        <Field label={t("balance.debt.rate")} hint={t("balance.debt.rate.hint")}>
          <TextInput
            inputMode="decimal"
            value={form.rate}
            onChange={(event) => change({ rate: event.target.value })}
            placeholder={t("common.example", { value: "12.5" })}
          />
        </Field>
        <Field label={t("balance.debt.payment")} hint={t("common.optional")}>
          <TextInput
            inputMode="decimal"
            prefix={CURRENCY_SYMBOL[form.currency]}
            value={form.monthlyPayment}
            onChange={(event) => change({ monthlyPayment: event.target.value })}
            placeholder="0"
          />
        </Field>
      </FormRow>
      <Field label={t("common.note")}>
        <TextInput
          value={form.note}
          onChange={(event) => change({ note: event.target.value })}
          placeholder={t("common.optional")}
        />
      </Field>
      {id && (
        <Button variant="danger" className={styles.wide} onClick={() => onDelete(id)}>
          {t("balance.debt.delete")}
        </Button>
      )}
    </Sheet>
  );
};

export default DebtSheet;
