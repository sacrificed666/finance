"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import {
  accountProblem,
  initialAccountForm,
  saveAccount,
  switchAccountKind,
  type AccountForm,
} from "@/features/accounts/model/accountForm";
import { archiveAccount } from "@/features/accounts/model/accounts";
import { BANKABLE_KINDS, brandInfo } from "@/features/accounts/model/brands";
import { CUSTOM_GAME_ID } from "@/features/accounts/model/games";
import { pricedDrafts } from "@/features/accounts/model/holdings";
import { ACCOUNT_KINDS } from "@/features/accounts/model/kinds";
import { ICON_CHOICES } from "@/features/data/model/defaults";
import type { SavingsAccount } from "@/features/data/model/types";
import { loadCoinQuotes } from "@/features/market/model/refresh";
import { useI18n } from "@/shared/i18n/useI18n";
import { CURRENCY_SYMBOL } from "@/shared/lib/money";
import { uid } from "@/shared/lib/uid";
import Button from "@/shared/ui/Button/Button";
import DateField from "@/shared/ui/DateField/DateField";
import Field from "@/shared/ui/Field/Field";
import MoneyField from "@/shared/ui/MoneyField/MoneyField";
import NameField from "@/shared/ui/NameField/NameField";
import Select from "@/shared/ui/Select/Select";
import Sheet from "@/shared/ui/Sheet/Sheet";
import SwitchRow from "@/shared/ui/SwitchRow/SwitchRow";
import TextInput from "@/shared/ui/TextInput/TextInput";

import BankField from "./BankField";
import CoinFields from "./CoinFields";
import GameFields from "./GameFields";

import styles from "./AccountSheet.module.scss";

interface AccountSheetProps {
  target: SavingsAccount | "new";
  onClose: () => void;
  onDelete: (id: string) => void;
  onReconcile: (id: string) => void;
  onPriceError: (message: string) => void;
}

// Adds or edits an account: kind, bank or game, coins, currency, balance, goal
const AccountSheet = ({ target, onClose, onDelete, onReconcile, onPriceError }: AccountSheetProps) => {
  const { update } = useStore();
  const { t } = useI18n();
  const [form, setForm] = useState<AccountForm>(() => initialAccountForm(target, uid));
  // The emoji is the mark only without a bank's or a known game's logo
  const ownIcon =
    !(BANKABLE_KINDS.has(form.kind) && brandInfo(form.bank)) &&
    !(form.kind === "skins" && form.game !== CUSTOM_GAME_ID);
  const [pricing, setPricing] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const problem = accountProblem(form);
  const id = form.id;
  // Changes some fields of the form
  const change = (fields: Partial<AccountForm>) => setForm((current) => ({ ...current, ...fields }));
  const archived = target !== "new" && target.archived === true;

  // Puts the account away from the pickers, or takes it back, and closes
  const toggleArchive = (accountId: string) => {
    update(
      (current) => archiveAccount(current, accountId, !archived),
      archived ? t("balance.acc.unarchived") : t("balance.acc.archived"),
    );
    onClose();
  };

  // The form with fresh coin prices, or a message when none came back
  const priced = async (current: AccountForm): Promise<AccountForm | string> => {
    const wanted = current.holdings.map((holding) => ({ coin: holding.coin, currency: current.currency }));
    const { quotes, failed } = await loadCoinQuotes(wanted);
    if (quotes.size === 0) return failed ? t("balance.prices.cryptoFailed") : t("balance.prices.none");
    return {
      ...current,
      pricedAt: new Date().toISOString(),
      holdings: pricedDrafts(current.holdings, quotes, current.currency),
    };
  };

  // Prices the coins on request and keeps the quantities typed meanwhile
  const loadPrices = async () => {
    if (form.holdings.length === 0) return;
    setPricing(true);
    setPriceError(null);
    const result = await priced(form);
    setPricing(false);
    if (typeof result === "string") {
      setPriceError(result);
      return;
    }
    setForm((current) => ({
      ...current,
      pricedAt: result.pricedAt,
      holdings: current.holdings.map((holding) => {
        const fresh = result.holdings.find((item) => item.coin === holding.coin);
        return fresh?.price ? { ...holding, price: fresh.price, icon: fresh.icon } : holding;
      }),
    }));
  };

  // Saves the account; coins without a price get one first when the bank answers
  const submit = async () => {
    if (problem) return;
    const stored = target === "new" ? undefined : target;
    const currencyChanged = stored !== undefined && stored.currency !== form.currency;
    let next = currencyChanged
      ? { ...form, holdings: form.holdings.map((holding) => ({ ...holding, price: undefined })) }
      : form;
    if (next.kind === "crypto" && next.holdings.some((holding) => holding.price === undefined)) {
      setPricing(true);
      const result = await priced(next);
      setPricing(false);
      if (typeof result === "string") onPriceError(result);
      else next = result;
    }
    update((s) => saveAccount(s, next, uid));
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      onSubmit={() => void submit()}
      problem={problem && t(problem.key, problem.params)}
      title={id ? t("balance.acc.edit") : t("balance.acc.new")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={problem !== null || pricing}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <Field label={t("balance.acc.kind")}>
        <Select
          value={form.kind}
          onChange={(event) => {
            const kind = ACCOUNT_KINDS.find((item) => item.value === event.target.value)?.value;
            if (kind) setForm(switchAccountKind(form, kind, uid));
          }}
        >
          {ACCOUNT_KINDS.map((kind) => (
            <option key={kind.value} value={kind.value}>
              {kind.icon} {t(`accountKind.${kind.value}`)}
            </option>
          ))}
        </Select>
      </Field>
      <NameField
        label={t("common.name")}
        value={form.name}
        onChange={(name) => change({ name })}
        placeholder={t("common.example", { value: t("balance.acc.namePlaceholder") })}
        icon={
          ownIcon
            ? { value: form.icon, options: ICON_CHOICES, onChange: (icon) => change({ icon }), label: t("common.icon") }
            : undefined
        }
      />
      {BANKABLE_KINDS.has(form.kind) && <BankField form={form} onChange={change} />}
      {form.kind === "skins" && <GameFields form={form} onChange={change} />}
      {form.kind === "crypto" && (
        <CoinFields
          form={form}
          onChange={change}
          pricing={pricing}
          error={priceError}
          onLoadPrices={() => void loadPrices()}
        />
      )}
      <MoneyField
        label={form.kind === "crypto" ? t("balance.crypto.cash") : t("balance.acc.opening")}
        hint={form.kind === "crypto" ? t("balance.crypto.cash.hint") : t("balance.acc.opening.hint")}
        value={form.openingBalance}
        onChange={(openingBalance) => change({ openingBalance })}
        currency={form.currency}
        onCurrency={(currency) => change({ currency })}
        currencyLabel={t("common.currency")}
        hero={form.kind !== "crypto"}
      />
      {form.kind === "card" && (
        <>
          <SwitchRow
            title={t("balance.credit")}
            hint={t("balance.credit.hint")}
            checked={form.creditEnabled}
            onChange={(creditEnabled) => change({ creditEnabled })}
          />
          {form.creditEnabled && (
            <Field label={t("balance.credit.limit")} hint={t("common.optional")}>
              <TextInput
                inputMode="decimal"
                prefix={CURRENCY_SYMBOL[form.currency]}
                value={form.creditLimit}
                onChange={(event) => change({ creditLimit: event.target.value })}
                placeholder="0"
              />
            </Field>
          )}
        </>
      )}
      <SwitchRow
        title={t("balance.goal")}
        checked={form.goalEnabled}
        onChange={(goalEnabled) => change({ goalEnabled })}
      />
      {form.goalEnabled && (
        <>
          <Field label={t("balance.goal.target")}>
            <TextInput
              inputMode="decimal"
              prefix={CURRENCY_SYMBOL[form.currency]}
              value={form.target}
              onChange={(event) => change({ target: event.target.value })}
              placeholder="0"
            />
          </Field>
          <Field label={t("balance.goal.deadline")} hint={t("common.optional")}>
            <DateField allowEmpty value={form.deadline} onChange={(value) => change({ deadline: value })} />
          </Field>
        </>
      )}
      {id && (
        <div className={styles.actions}>
          {form.kind !== "crypto" && (
            <Button variant="ghost" className={styles.action} onClick={() => onReconcile(id)}>
              {t("balance.acc.reconcile")}
            </Button>
          )}
          <Button variant="ghost" className={styles.action} onClick={() => toggleArchive(id)}>
            {archived ? t("balance.acc.unarchive") : t("balance.acc.archive")}
          </Button>
          <Button variant="danger" className={styles.action} onClick={() => onDelete(id)}>
            {t("common.delete")}
          </Button>
        </div>
      )}
    </Sheet>
  );
};

export default AccountSheet;
