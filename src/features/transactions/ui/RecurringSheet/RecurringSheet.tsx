"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import { activeAccounts } from "@/features/accounts/model/accounts";
import { useAccountGroups } from "@/features/accounts/model/useAccountGroups";
import { FREQUENCIES } from "@/features/data/model/frequency";
import type { CategoryKind, Frequency, RecurringRule, Transaction } from "@/features/data/model/types";
import { categoryTree } from "@/features/transactions/model/categories";
import {
  instalmentEnd,
  instalmentPayment,
  recurringProblem,
  ruleFromEntry,
  saveRecurring,
  startRuleFrom,
} from "@/features/transactions/model/recurring";
import { deleteSchedule } from "@/features/transactions/model/schedules";
import { useCategoryGroups } from "@/features/transactions/model/useCategoryGroups";
import { useI18n } from "@/shared/i18n/useI18n";
import { currentMonth, formatMonthText } from "@/shared/lib/date";
import { formatMoney, parseAmount, type Currency } from "@/shared/lib/money";
import { uid } from "@/shared/lib/uid";
import Button from "@/shared/ui/Button/Button";
import ConfirmDialog from "@/shared/ui/ConfirmDialog/ConfirmDialog";
import Field from "@/shared/ui/Field/Field";
import FieldSet from "@/shared/ui/FieldSet/FieldSet";
import FormRow from "@/shared/ui/FormRow/FormRow";
import MoneyField from "@/shared/ui/MoneyField/MoneyField";
import MonthInput from "@/shared/ui/MonthInput/MonthInput";
import OptionPicker from "@/shared/ui/OptionPicker/OptionPicker";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";
import Sheet from "@/shared/ui/Sheet/Sheet";
import SwitchRow from "@/shared/ui/SwitchRow/SwitchRow";
import TextInput from "@/shared/ui/TextInput/TextInput";

import styles from "./RecurringSheet.module.scss";

interface RecurringForm {
  id: string | null;
  type: CategoryKind;
  amount: string;
  currency: Currency;
  categoryId: string;
  note: string;
  accountId: string;
  day: string;
  startMonth: string;
  endMonth: string;
  period: Frequency;
  instalment: boolean;
  count: string;
}

interface RecurringSheetProps {
  target: RecurringRule | "new";
  from?: Transaction;
  onClose: () => void;
}

// Adds or edits a repeating entry, or a purchase paid in parts
const RecurringSheet = ({ target, from, onClose }: RecurringSheetProps) => {
  const { state, update } = useStore();
  const { t, tp } = useI18n();
  const expenseGroups = useCategoryGroups(state.categories, ["expense"]);
  const incomeGroups = useCategoryGroups(state.categories, ["income"]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // The first category of a kind, to start a rule of that kind with
  const firstCategoryId = (kind: CategoryKind) => categoryTree(state.categories, kind)[0]?.parent.id ?? "";
  // The rule the form starts from: the edited one, or one an entry suggests
  const seed = target !== "new" ? target : from ? ruleFromEntry(from, "") : null;
  const [form, setForm] = useState<RecurringForm>(() =>
    seed === null
      ? {
          id: null,
          type: "expense",
          amount: "",
          currency: state.settings.baseCurrency,
          categoryId: firstCategoryId("expense"),
          note: "",
          accountId: activeAccounts(state.savings)[0]?.id ?? "",
          day: "1",
          startMonth: currentMonth(),
          endMonth: "",
          period: "monthly",
          instalment: false,
          count: "",
        }
      : {
          id: target === "new" ? null : seed.id,
          type: seed.type,
          amount: String(seed.instalment?.total ?? seed.amount),
          currency: seed.currency,
          categoryId: seed.categoryId,
          note: seed.note ?? "",
          accountId: seed.accountId ?? "",
          day: String(seed.dayOfMonth),
          startMonth: seed.startMonth,
          endMonth: seed.endMonth ?? "",
          period: seed.period ?? "monthly",
          instalment: seed.instalment !== undefined,
          count: seed.instalment ? String(seed.instalment.count) : "",
        },
  );
  const accountGroups = useAccountGroups(
    state.savings,
    [{ value: "", label: t("common.notAssigned") }],
    [form.accountId],
  );

  const typed = parseAmount(form.amount);
  const dayOfMonth = Number(form.day.trim());
  const instalment = form.type === "expense" && form.instalment;
  const count = Number(form.count.trim());
  const countValid = Number.isInteger(count) && count >= 2 && count <= 120;
  const amount = instalment && countValid ? instalmentPayment(typed, count) : typed;
  const endMonth = instalment && countValid ? instalmentEnd(form.startMonth, count, form.period) : form.endMonth;
  const problem =
    recurringProblem({ ...form, endMonth, amount, dayOfMonth }) ??
    (instalment && !countValid ? "tx.rec.problem.count" : null);
  const weekly = form.period === "weekly";
  const frequencies = FREQUENCIES.filter((frequency) => !instalment || frequency !== "weekly");
  const posted = form.id ? state.transactions.filter((tx) => tx.recurringId === form.id).length : 0;

  // Keeps the rule and posts its months again to match it
  const save = () => {
    if (problem) return;
    const rule: RecurringRule = {
      id: form.id ?? uid(),
      type: form.type,
      amount,
      currency: form.currency,
      categoryId: form.categoryId,
      note: form.note.trim() || undefined,
      accountId: form.accountId || undefined,
      dayOfMonth,
      startMonth: form.startMonth,
      endMonth: endMonth || undefined,
      period: form.period === "monthly" ? undefined : form.period,
      instalment: instalment ? { total: typed, count } : undefined,
    };
    if (from) update((s) => startRuleFrom(s, from.id, rule), t("tx.repeat.done"));
    else update((s) => saveRecurring(s, rule));
    onClose();
  };

  // Removes the rule and the entries it posted, with an undo
  const remove = () => {
    const id = form.id;
    if (!id) return;
    update((s) => deleteSchedule(s, "recurring", id), t("tx.recurring.deleted"));
    onClose();
  };

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        onSubmit={save}
        problem={problem && t(problem)}
        title={form.id ? t("tx.rec.edit") : t("tx.rec.new")}
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
        {form.id && <p className={styles.rewrite}>{t("tx.rec.rewriteNote")}</p>}
        <SegmentedControl<CategoryKind>
          label={t("tx.kind")}
          options={[
            { value: "expense", label: t("tx.type.expense") },
            { value: "income", label: t("tx.type.income") },
          ]}
          value={form.type}
          onChange={(type) => setForm({ ...form, type, categoryId: firstCategoryId(type) })}
        />
        <FieldSet label={t("tx.freq.label")}>
          <SegmentedControl<Frequency>
            label={t("tx.freq.label")}
            options={frequencies.map((frequency) => ({ value: frequency, label: t(`tx.freq.option.${frequency}`) }))}
            value={form.period}
            onChange={(period) => setForm({ ...form, period })}
          />
        </FieldSet>
        {form.type === "expense" && (
          <SwitchRow
            title={t("tx.rec.instalment")}
            hint={t("tx.rec.instalment.hint")}
            checked={form.instalment}
            onChange={(on) => setForm({ ...form, instalment: on, period: on && weekly ? "monthly" : form.period })}
          />
        )}
        <MoneyField
          label={instalment ? t("tx.rec.instalment.total") : t("common.amount")}
          hint={
            instalment && countValid && Number.isFinite(typed) && typed > 0
              ? t("tx.rec.instalment.each", {
                  count,
                  amount: formatMoney(amount, form.currency, { exact: true }),
                  month: formatMonthText(endMonth),
                })
              : undefined
          }
          value={form.amount}
          onChange={(value) => setForm({ ...form, amount: value })}
          currency={form.currency}
          onCurrency={(currency) => setForm({ ...form, currency })}
          currencyLabel={t("common.currency")}
          hero
        />
        <Field label={t("common.category")}>
          <OptionPicker
            label={t("common.category")}
            value={form.categoryId}
            onChange={(categoryId) => setForm({ ...form, categoryId })}
            groups={form.type === "income" ? incomeGroups : expenseGroups}
          />
        </Field>
        <FormRow wide="first">
          <Field label={t("common.account")} hint={t("tx.schedule.accountHint")}>
            <OptionPicker
              label={t("common.account")}
              value={form.accountId}
              onChange={(accountId) => setForm({ ...form, accountId })}
              groups={accountGroups}
            />
          </Field>
          <Field
            label={weekly ? t("tx.rec.firstDay") : t("tx.rec.day")}
            hint={weekly ? t("tx.rec.firstDayHint") : t("tx.schedule.dayHint")}
          >
            <TextInput
              inputMode="numeric"
              value={form.day}
              onChange={(event) => setForm({ ...form, day: event.target.value })}
            />
          </Field>
        </FormRow>
        <FieldSet label={t("tx.schedule.from")}>
          <MonthInput
            name={t("tx.schedule.from")}
            value={form.startMonth}
            onChange={(startMonth) => setForm({ ...form, startMonth })}
          />
        </FieldSet>
        {instalment ? (
          <Field label={t("tx.rec.instalment.count")}>
            <TextInput
              inputMode="numeric"
              value={form.count}
              onChange={(event) => setForm({ ...form, count: event.target.value })}
            />
          </Field>
        ) : (
          <FieldSet label={t("tx.schedule.until")} hint={t("tx.schedule.untilHint")}>
            <MonthInput
              name={t("tx.schedule.until")}
              allowEmpty
              value={form.endMonth}
              onChange={(until) => setForm({ ...form, endMonth: until })}
            />
          </FieldSet>
        )}
        <Field label={t("common.note")}>
          <TextInput
            placeholder={t("common.optional")}
            value={form.note}
            onChange={(event) => setForm({ ...form, note: event.target.value })}
          />
        </Field>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title={t("tx.rec.deleteTitle")}
        message={tp("tx.rec.deleteMessage", posted)}
      />
    </>
  );
};

export default RecurringSheet;
