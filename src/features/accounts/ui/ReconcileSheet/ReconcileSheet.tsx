"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import { adjustmentEntry, reconcileProblem } from "@/features/accounts/model/reconcile";
import { accountBalances } from "@/features/data/model/finmath";
import { useI18n } from "@/shared/i18n/useI18n";
import { todayISO } from "@/shared/lib/date";
import { CURRENCY_SYMBOL, parseAmount } from "@/shared/lib/money";
import { uid } from "@/shared/lib/uid";
import Button from "@/shared/ui/Button/Button";
import Field from "@/shared/ui/Field/Field";
import Money from "@/shared/ui/Money/Money";
import Sheet from "@/shared/ui/Sheet/Sheet";
import TextInput from "@/shared/ui/TextInput/TextInput";

import styles from "./ReconcileSheet.module.scss";

interface ReconcileSheetProps {
  accountId: string;
  amount?: number;
  onClose: () => void;
}

// Brings an account to the balance the bank shows with one adjusting entry
const ReconcileSheet = ({ accountId, amount: bankAmount, onClose }: ReconcileSheetProps) => {
  const { state, update } = useStore();
  const { t } = useI18n();
  const today = todayISO();
  const [typed, setTyped] = useState(bankAmount === undefined ? "" : String(bankAmount));
  const account = state.savings.find((item) => item.id === accountId);
  const current = account ? (accountBalances(state, today).get(account.id) ?? 0) : 0;
  const problem = account ? reconcileProblem(state, typed, current) : null;

  // Books the difference and closes
  const submit = () => {
    if (!account || problem) return;
    const entry = adjustmentEntry(
      state,
      account,
      parseAmount(typed) - current,
      today,
      t("balance.move.note", { name: account.name }),
      uid(),
    );
    if (!entry) return;
    update((s) => ({ ...s, transactions: [...s.transactions, entry] }), t("balance.move.done"));
    onClose();
  };

  return (
    <Sheet
      open={account !== undefined}
      onClose={onClose}
      onSubmit={submit}
      problem={problem && t(problem)}
      title={t("balance.move.title", { name: account?.name ?? "" })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={!account || problem !== null}>
            {t("balance.move.adjust")}
          </Button>
        </>
      }
    >
      {account && (
        <p className={styles.current}>
          {t("balance.move.current")}{" "}
          <Money amount={current} currency={account.currency} exact className={styles.amount} />
        </p>
      )}
      <Field label={t("balance.move.bankShows")} hint={t("balance.move.bankShows.hint")}>
        <TextInput
          inputMode="decimal"
          prefix={account ? CURRENCY_SYMBOL[account.currency] : undefined}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder={account ? String(Math.round(current)) : "0"}
        />
      </Field>
    </Sheet>
  );
};

export default ReconcileSheet;
