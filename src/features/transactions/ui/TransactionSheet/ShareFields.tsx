"use client";

import { useStore } from "@/app/hooks";
import { entryFigures, type EntryForm } from "@/features/transactions/model/entryForm";
import { useI18n } from "@/shared/i18n/useI18n";
import { CURRENCY_SYMBOL, formatMoney } from "@/shared/lib/money";
import Field from "@/shared/ui/Field/Field";
import FormRow from "@/shared/ui/FormRow/FormRow";
import SwitchRow from "@/shared/ui/SwitchRow/SwitchRow";
import TextInput from "@/shared/ui/TextInput/TextInput";

import styles from "./TransactionSheet.module.scss";

interface ShareFieldsProps {
  form: EntryForm;
  onChange: (fields: Partial<EntryForm>) => void;
}

// How many of the people who owed before are offered by name
const KNOWN_NAMES = 5;

// Part of a new expense someone owes back: who and how much, half to start with
const ShareFields = ({ form, onChange }: ShareFieldsProps) => {
  const { state } = useStore();
  const { t } = useI18n();
  const { amount, owed } = entryFigures(state, form);
  const share = form.share;
  const names = [...new Set(state.receivables.toReversed().map((item) => item.name))].slice(0, KNOWN_NAMES);
  // Turns the share on with half the sum, or off
  const toggle = (on: boolean) =>
    onChange({
      share: on
        ? { name: "", amount: Number.isFinite(amount) && amount > 0 ? String(Math.round(amount * 50) / 100) : "" }
        : null,
    });
  // Changes who owes or how much
  const set = (fields: Partial<NonNullable<EntryForm["share"]>>) => {
    if (share) onChange({ share: { ...share, ...fields } });
  };
  const mine = amount - owed;

  return (
    <>
      <SwitchRow title={t("tx.share")} hint={t("tx.share.hint")} checked={share !== null} onChange={toggle} />
      {share && (
        <>
          <FormRow>
            <Field label={t("tx.share.name")}>
              <TextInput value={share.name} maxLength={80} onChange={(event) => set({ name: event.target.value })} />
            </Field>
            <Field label={t("tx.share.amount")}>
              <TextInput
                inputMode="decimal"
                prefix={CURRENCY_SYMBOL[form.currency]}
                value={share.amount}
                onChange={(event) => set({ amount: event.target.value })}
              />
            </Field>
          </FormRow>
          {names.length > 0 && (
            <div className={styles.shareNames}>
              {names.map((name) => (
                <button key={name} type="button" onClick={() => set({ name })} className={styles.shareName}>
                  {name}
                </button>
              ))}
            </div>
          )}
          {Number.isFinite(mine) && mine > 0 && owed > 0 && (
            <p className={styles.shareMine}>{t("tx.share.mine", { amount: formatMoney(mine, form.currency) })}</p>
          )}
        </>
      )}
    </>
  );
};

export default ShareFields;
