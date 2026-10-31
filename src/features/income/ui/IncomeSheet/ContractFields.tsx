"use client";

import type { IncomeForm } from "@/features/income/model/incomeForm";
import { useI18n } from "@/shared/i18n/useI18n";
import { CURRENCY_SYMBOL } from "@/shared/lib/money";
import Field from "@/shared/ui/Field/Field";
import FormRow from "@/shared/ui/FormRow/FormRow";
import TextInput from "@/shared/ui/TextInput/TextInput";

interface ContractFieldsProps {
  form: IncomeForm;
  onChange: (fields: Partial<IncomeForm>) => void;
}

// The working days and the day rate, then the premium, compensations and cut-offs
const ContractFields = ({ form, onChange }: ContractFieldsProps) => {
  const { t } = useI18n();
  return (
    <>
      <FormRow>
        <Field label={t("income.days")}>
          <TextInput
            inputMode="decimal"
            value={form.days}
            onChange={(event) => onChange({ days: event.target.value })}
            placeholder={t("common.example", { value: "21" })}
          />
        </Field>
        <Field label={t("income.dailyRate")}>
          <TextInput
            inputMode="decimal"
            prefix={CURRENCY_SYMBOL[form.currency]}
            value={form.dailyRate}
            onChange={(event) => onChange({ dailyRate: event.target.value })}
            placeholder="0"
          />
        </Field>
      </FormRow>
      <FormRow>
        <Field label={t("income.premium")}>
          <TextInput
            inputMode="decimal"
            value={form.premium}
            onChange={(event) => onChange({ premium: event.target.value })}
            placeholder="0"
          />
        </Field>
        <Field label={t("income.compensations")}>
          <TextInput
            inputMode="decimal"
            value={form.compensations}
            onChange={(event) => onChange({ compensations: event.target.value })}
            placeholder="0"
          />
        </Field>
        <Field label={t("income.cutoffs")}>
          <TextInput
            inputMode="decimal"
            value={form.cutoffs}
            onChange={(event) => onChange({ cutoffs: event.target.value })}
            placeholder="0"
          />
        </Field>
      </FormRow>
    </>
  );
};

export default ContractFields;
