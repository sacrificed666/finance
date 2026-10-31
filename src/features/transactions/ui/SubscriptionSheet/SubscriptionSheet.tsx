"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import { activeAccounts } from "@/features/accounts/model/accounts";
import { useAccountGroups } from "@/features/accounts/model/useAccountGroups";
import { ICON_CHOICES } from "@/features/data/model/defaults";
import { FREQUENCIES, perMonth } from "@/features/data/model/frequency";
import type { Subscription, SubscriptionPeriod } from "@/features/data/model/types";
import { deleteSchedule } from "@/features/transactions/model/schedules";
import { resumeSubscription, saveSubscription, subscriptionProblem } from "@/features/transactions/model/subscriptions";
import { useI18n } from "@/shared/i18n/useI18n";
import { currentMonth, formatMonthText } from "@/shared/lib/date";
import { formatMoney, parseAmount, type Currency } from "@/shared/lib/money";
import { uid } from "@/shared/lib/uid";
import Button from "@/shared/ui/Button/Button";
import Callout from "@/shared/ui/Callout/Callout";
import ConfirmDialog from "@/shared/ui/ConfirmDialog/ConfirmDialog";
import Field from "@/shared/ui/Field/Field";
import FieldSet from "@/shared/ui/FieldSet/FieldSet";
import FormRow from "@/shared/ui/FormRow/FormRow";
import Icon from "@/shared/ui/Icon/Icon";
import MoneyField from "@/shared/ui/MoneyField/MoneyField";
import MonthInput from "@/shared/ui/MonthInput/MonthInput";
import NameField from "@/shared/ui/NameField/NameField";
import OptionPicker from "@/shared/ui/OptionPicker/OptionPicker";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";
import Sheet from "@/shared/ui/Sheet/Sheet";
import TextInput from "@/shared/ui/TextInput/TextInput";

import styles from "./SubscriptionSheet.module.scss";

interface SubscriptionForm {
  id: string | null;
  name: string;
  icon: string;
  price: string;
  currency: Currency;
  period: SubscriptionPeriod;
  accountId: string;
  day: string;
  startMonth: string;
  endMonth: string;
}

export interface SubscriptionDraftValues {
  name: string;
  price: number;
  currency: Currency;
  dayOfMonth: number;
  startMonth: string;
  accountId?: string;
}

interface SubscriptionSheetProps {
  target: Subscription | "new";
  draft?: SubscriptionDraftValues;
  onClose: () => void;
}

// Adds or edits a weekly to yearly subscription, resumes or ends it
const SubscriptionSheet = ({ target, draft, onClose }: SubscriptionSheetProps) => {
  const { state, update } = useStore();
  const { t, tp } = useI18n();
  const thisMonth = currentMonth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState<SubscriptionForm>(() =>
    target === "new"
      ? {
          id: null,
          name: draft?.name ?? "",
          icon: "📱",
          price: draft ? String(draft.price) : "",
          currency: draft?.currency ?? "UAH",
          period: "monthly",
          accountId: draft?.accountId ?? activeAccounts(state.savings)[0]?.id ?? "",
          day: draft ? String(draft.dayOfMonth) : "1",
          startMonth: draft?.startMonth ?? thisMonth,
          endMonth: "",
        }
      : {
          id: target.id,
          name: target.name,
          icon: target.icon,
          price: String(target.price),
          currency: target.currency,
          period: target.period,
          accountId: target.accountId ?? "",
          day: String(target.dayOfMonth),
          startMonth: target.startMonth,
          endMonth: target.endMonth ?? "",
        },
  );

  const accountGroups = useAccountGroups(
    state.savings,
    [{ value: "", label: t("common.notAssigned") }],
    [form.accountId],
  );
  const price = parseAmount(form.price);
  const dayOfMonth = Number(form.day.trim());
  const problem = subscriptionProblem({ ...form, price, dayOfMonth });
  const editing = form.id ? state.subscriptions.find((subscription) => subscription.id === form.id) : undefined;
  const posted = form.id ? state.transactions.filter((tx) => tx.subscriptionId === form.id).length : 0;
  const yearly = form.period === "yearly";

  // Keeps the subscription and posts its charges again to match it
  const save = () => {
    if (problem) return;
    update((s) =>
      saveSubscription(s, {
        id: form.id ?? uid(),
        name: form.name.trim(),
        icon: form.icon,
        price,
        currency: form.currency,
        period: form.period,
        accountId: form.accountId || undefined,
        dayOfMonth,
        startMonth: form.startMonth,
        endMonth: form.endMonth || undefined,
        active: true,
      }),
    );
    onClose();
  };

  // Runs a paused subscription again, with an undo
  const resume = () => {
    const id = form.id;
    if (id) update((s) => resumeSubscription(s, id), t("tx.subs.resumed"));
  };

  // Removes the subscription and the charges it posted, with an undo
  const remove = () => {
    const id = form.id;
    if (!id) return;
    update((s) => deleteSchedule(s, "subscription", id), t("tx.subs.deleted"));
    onClose();
  };

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        onSubmit={save}
        problem={problem && t(problem)}
        title={form.id ? t("tx.subs.edit") : t("tx.subs.new")}
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
        {editing && !editing.active && (
          <Callout tone="warning" title={t("tx.subs.pausedTitle")}>
            <p>{t("tx.subs.pausedNote")}</p>
            <Button variant="ghost" size="sm" className={styles.below} onClick={resume}>
              <Icon name="refresh" size={14} />
              {t("tx.subs.resume")}
            </Button>
          </Callout>
        )}
        {form.id && <p className={styles.rewrite}>{t("tx.subs.rewriteNote")}</p>}
        <NameField
          label={t("common.name")}
          value={form.name}
          onChange={(name) => setForm({ ...form, name })}
          placeholder={t("common.example", { value: "YouTube Premium" })}
          icon={{
            value: form.icon,
            options: ICON_CHOICES,
            onChange: (icon) => setForm({ ...form, icon }),
            label: t("common.icon"),
          }}
        />
        <FieldSet label={t("tx.subs.period")}>
          <SegmentedControl<SubscriptionPeriod>
            label={t("tx.subs.period")}
            options={FREQUENCIES.map((frequency) => ({ value: frequency, label: t(`tx.freq.option.${frequency}`) }))}
            value={form.period}
            onChange={(period) => setForm({ ...form, period })}
          />
        </FieldSet>
        <MoneyField
          label={t(`tx.subs.pricePer.${form.period}`)}
          hint={
            form.period !== "monthly" && Number.isFinite(price) && price > 0
              ? t(yearly ? "tx.subs.postedAs" : "tx.subs.postedAvg", {
                  amount: formatMoney(perMonth(price, form.period), form.currency, { exact: true }),
                })
              : undefined
          }
          value={form.price}
          onChange={(value) => setForm({ ...form, price: value })}
          currency={form.currency}
          onCurrency={(currency) => setForm({ ...form, currency })}
          currencyLabel={t("common.currency")}
          hero
        />
        <FormRow wide="first">
          <Field label={t("common.account")} hint={t("tx.schedule.accountHint")}>
            <OptionPicker
              label={t("common.account")}
              value={form.accountId}
              onChange={(accountId) => setForm({ ...form, accountId })}
              groups={accountGroups}
            />
          </Field>
          <Field label={t("tx.subs.chargeDay")} hint={t("tx.schedule.dayHint")}>
            <TextInput
              inputMode="numeric"
              value={form.day}
              onChange={(event) => setForm({ ...form, day: event.target.value })}
            />
          </Field>
        </FormRow>
        <FieldSet label={t("tx.subs.billingFrom")} hint={t("tx.subs.billingFrom.hint")}>
          <MonthInput
            name={t("tx.subs.billingFrom")}
            value={form.startMonth}
            onChange={(startMonth) => setForm({ ...form, startMonth })}
          />
        </FieldSet>
        <FieldSet label={t("tx.schedule.until")} hint={t("tx.subs.until.hint")}>
          <MonthInput
            name={t("tx.schedule.until")}
            allowEmpty
            value={form.endMonth}
            onChange={(endMonth) => setForm({ ...form, endMonth })}
          />
          {form.id && form.startMonth <= thisMonth && form.endMonth !== thisMonth && (
            <Button
              variant="ghost"
              size="sm"
              className={styles.below}
              onClick={() => setForm({ ...form, endMonth: thisMonth })}
            >
              <Icon name="close" size={13} strokeWidth={2.4} />
              {t("tx.subs.endThisMonth", { month: formatMonthText(thisMonth) })}
            </Button>
          )}
        </FieldSet>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title={t("tx.subs.deleteTitle")}
        message={tp("tx.subs.deleteMessage", posted)}
      />
    </>
  );
};

export default SubscriptionSheet;
