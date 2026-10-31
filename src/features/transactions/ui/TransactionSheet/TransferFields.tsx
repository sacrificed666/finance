"use client";

import { useStore } from "@/app/hooks";
import { useAccountGroups } from "@/features/accounts/model/useAccountGroups";
import { entryFigures, type EntryForm } from "@/features/transactions/model/entryForm";
import { useI18n } from "@/shared/i18n/useI18n";
import { convert, CURRENCY_SYMBOL, formatMoney } from "@/shared/lib/money";
import Field from "@/shared/ui/Field/Field";
import OptionPicker from "@/shared/ui/OptionPicker/OptionPicker";
import TextInput from "@/shared/ui/TextInput/TextInput";

import styles from "./TransactionSheet.module.scss";

interface TransferFieldsProps {
  form: EntryForm;
  onChange: (fields: Partial<EntryForm>) => void;
}

// The two accounts of a transfer, what was sent and, across currencies, received
const TransferFields = ({ form, onChange }: TransferFieldsProps) => {
  const { state } = useStore();
  const { t } = useI18n();
  const accountGroups = useAccountGroups(state.savings, [], [form.accountId, form.toAccountId]);
  const { from, to, amount, crossCurrency } = entryFigures(state, form);
  const rate =
    crossCurrency && from && to && Number.isFinite(amount) && amount > 0
      ? formatMoney(convert(amount, from.currency, to.currency, state.settings.rates) / amount, to.currency, {
          exact: true,
        })
      : null;
  // Picks the account the money leaves, in that account's currency
  const pickFrom = (accountId: string) =>
    onChange({ accountId, currency: state.savings.find((item) => item.id === accountId)?.currency ?? form.currency });

  return (
    <>
      <div className={styles.accounts}>
        <Field label={t("tx.fromAccount")}>
          <OptionPicker label={t("tx.fromAccount")} value={form.accountId} onChange={pickFrom} groups={accountGroups} />
        </Field>
        <Field label={t("tx.toAccount")}>
          <OptionPicker
            label={t("tx.toAccount")}
            value={form.toAccountId}
            onChange={(toAccountId) => onChange({ toAccountId })}
            groups={accountGroups}
          />
        </Field>
      </div>
      <Field label={from ? t("tx.amountSentIn", { currency: from.currency }) : t("tx.amountSent")}>
        <TextInput
          inputMode="decimal"
          placeholder="0"
          prefix={CURRENCY_SYMBOL[from?.currency ?? form.currency]}
          value={form.amount}
          onChange={(event) => onChange({ amount: event.target.value })}
        />
      </Field>
      {crossCurrency && (
        <Field
          label={t("tx.amountReceived", { currency: to?.currency ?? "" })}
          hint={rate ? t("tx.impliedRate", { rate }) : undefined}
        >
          <TextInput
            inputMode="decimal"
            placeholder="0"
            prefix={to ? CURRENCY_SYMBOL[to.currency] : undefined}
            value={form.toAmount}
            onChange={(event) => onChange({ toAmount: event.target.value })}
          />
        </Field>
      )}
    </>
  );
};

export default TransferFields;
