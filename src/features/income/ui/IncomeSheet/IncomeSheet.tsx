"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import { activeAccounts } from "@/features/accounts/model/accounts";
import { useAccountGroups } from "@/features/accounts/model/useAccountGroups";
import type { Transaction } from "@/features/data/model/types";
import {
  blankIncomeForm,
  incomeFigures,
  incomeFormFor,
  incomeProblem,
  saveIncome,
  type IncomeForm,
  type IncomeMode,
} from "@/features/income/model/incomeForm";
import { deleteEntries } from "@/features/transactions/model/ledger";
import { useCategoryGroups } from "@/features/transactions/model/useCategoryGroups";
import { useI18n } from "@/shared/i18n/useI18n";
import { todayISO } from "@/shared/lib/date";
import { CURRENCY_OPTIONS } from "@/shared/lib/money";
import { uid } from "@/shared/lib/uid";
import Button from "@/shared/ui/Button/Button";
import ConfirmDialog from "@/shared/ui/ConfirmDialog/ConfirmDialog";
import DateField from "@/shared/ui/DateField/DateField";
import Field from "@/shared/ui/Field/Field";
import FieldSet from "@/shared/ui/FieldSet/FieldSet";
import FormRow from "@/shared/ui/FormRow/FormRow";
import MoneyField from "@/shared/ui/MoneyField/MoneyField";
import OptionPicker from "@/shared/ui/OptionPicker/OptionPicker";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";
import Sheet from "@/shared/ui/Sheet/Sheet";
import TextInput from "@/shared/ui/TextInput/TextInput";

import ContractFields from "./ContractFields";
import NetPreview from "./NetPreview";
import TaxFields from "./TaxFields";

import styles from "./IncomeSheet.module.scss";

interface IncomeSheetProps {
  target: Transaction | "new";
  onClose: () => void;
}

// Adds or edits an income: an amount or a day rate, its account and its tax
const IncomeSheet = ({ target, onClose }: IncomeSheetProps) => {
  const { state, update } = useStore();
  const { t } = useI18n();
  const { settings } = state;
  const categoryGroups = useCategoryGroups(state.categories, ["income"]);
  const [form, setForm] = useState<IncomeForm>(() =>
    target === "new" ? blankIncomeForm(state, todayISO()) : incomeFormFor(state, target, todayISO()),
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const accountGroups = useAccountGroups(
    state.savings,
    [{ value: "", label: t("common.notAssigned") }],
    [form.accountId],
  );
  const problem = incomeProblem(form, settings);
  const figures = incomeFigures(form, settings);
  // Changes some fields of the form
  const change = (fields: Partial<IncomeForm>) => setForm({ ...form, ...fields });

  // Keeps the income
  const save = () => {
    if (problem) return;
    update((s) => saveIncome(s, form, uid));
    onClose();
  };

  // Removes the income, with an undo
  const remove = () => {
    const id = form.id;
    if (!id) return;
    update((s) => deleteEntries(s, new Set([id])), t("income.deleted"));
    onClose();
  };

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        onSubmit={save}
        problem={problem && t(problem)}
        title={form.id ? t("income.edit") : t("income.new")}
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
        <SegmentedControl<IncomeMode>
          label={t("income.mode.label")}
          options={[
            { value: "amount", label: t("income.mode.amount") },
            { value: "contract", label: t("income.mode.contract") },
          ]}
          value={form.mode}
          onChange={(mode) => change({ mode })}
        />
        {form.mode === "contract" && <p className={styles.modeHint}>{t("income.mode.contract.hint")}</p>}

        {form.mode === "amount" ? (
          <MoneyField
            label={figures.profile ? t("income.grossAmount") : t("common.amount")}
            value={form.amount}
            onChange={(amount) => change({ amount })}
            currency={form.currency}
            onCurrency={(currency) => change({ currency })}
            currencyLabel={t("common.currency")}
            hero
          />
        ) : (
          <>
            <FieldSet label={t("common.currency")}>
              <SegmentedControl
                label={t("common.currency")}
                options={CURRENCY_OPTIONS}
                value={form.currency}
                onChange={(currency) => change({ currency })}
              />
            </FieldSet>
            <ContractFields form={form} onChange={change} />
          </>
        )}

        <Field label={t("common.category")}>
          <OptionPicker
            label={t("common.category")}
            value={form.categoryId}
            onChange={(categoryId) => change({ categoryId })}
            groups={categoryGroups}
          />
        </Field>

        <Field
          label={t("income.landedIn")}
          hint={activeAccounts(state.savings).length === 0 ? t("income.landedIn.none") : t("income.landedIn.hint")}
        >
          <OptionPicker
            label={t("income.landedIn")}
            value={form.accountId}
            onChange={(accountId) => change({ accountId })}
            groups={accountGroups}
          />
        </Field>

        <FormRow wide="last">
          <Field label={t("common.date")}>
            <DateField value={form.date} onChange={(value) => change({ date: value })} />
          </Field>
          <Field label={form.mode === "contract" ? t("income.source") : t("common.note")}>
            <TextInput
              value={form.note}
              onChange={(event) => change({ note: event.target.value })}
              placeholder={form.mode === "contract" ? t("income.source.placeholder") : t("common.optional")}
            />
          </Field>
        </FormRow>

        <TaxFields form={form} onChange={change} />

        {Number.isFinite(figures.net) && figures.net > 0 && <NetPreview form={form} />}
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title={t("income.deleteTitle")}
        message={t("common.deletePermanent")}
      />
    </>
  );
};

export default IncomeSheet;
