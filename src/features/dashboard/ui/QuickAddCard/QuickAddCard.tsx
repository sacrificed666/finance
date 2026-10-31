"use client";

import { useEffect, useRef, useState } from "react";

import { useStore } from "@/app/hooks";
import { activeAccounts } from "@/features/accounts/model/accounts";
import { useAccountGroups } from "@/features/accounts/model/useAccountGroups";
import { addQuickEntry, quickAccount, quickCategory, type QuickType } from "@/features/dashboard/model/quickAdd";
import { displayCurrencies } from "@/features/data/model/currencies";
import { frequentEntries, type FrequentEntry } from "@/features/transactions/model/frequent";
import { useCategoryGroups } from "@/features/transactions/model/useCategoryGroups";
import FrequentChips from "@/features/transactions/ui/FrequentChips/FrequentChips";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { todayISO } from "@/shared/lib/date";
import { parseAmount, type Currency } from "@/shared/lib/money";
import { uid } from "@/shared/lib/uid";
import Button from "@/shared/ui/Button/Button";
import Card from "@/shared/ui/Card/Card";
import Field from "@/shared/ui/Field/Field";
import MoneyField from "@/shared/ui/MoneyField/MoneyField";
import OptionPicker from "@/shared/ui/OptionPicker/OptionPicker";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";
import TextInput from "@/shared/ui/TextInput/TextInput";

import styles from "./QuickAddCard.module.scss";

// How long the button says the entry was added
const ADDED_MS = 1600;

// How many entries typed often the card offers
const QUICK_FREQUENT = 4;

// Adds an income or expense for today without leaving the dashboard
const QuickAddCard = () => {
  const { state, update } = useStore();
  const { t } = useI18n();
  const currencies = displayCurrencies(state);
  const expenseGroups = useCategoryGroups(state.categories, ["expense"]);
  const incomeGroups = useCategoryGroups(state.categories, ["income"]);
  const [type, setType] = useState<QuickType>("expense");
  const [amount, setAmount] = useState("");
  const [currencyChoice, setCurrencyChoice] = useState<Currency | null>(null);
  const [categoryChoice, setCategoryChoice] = useState<string | null>(null);
  const [accountChoice, setAccountChoice] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [added, setAdded] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoryId = quickCategory(state, type, categoryChoice);
  const accountId = quickAccount(state, accountChoice);
  const accountGroups = useAccountGroups(state.savings, [{ value: "", label: t("common.notAssigned") }], [accountId]);
  const accountCurrency = state.savings.find((account) => account.id === accountId)?.currency;
  const currency = currencyChoice ?? accountCurrency ?? state.settings.baseCurrency;
  const parsed = parseAmount(amount);
  const valid = Number.isFinite(parsed) && parsed > 0 && categoryId !== "";
  const hasAccounts = activeAccounts(state.savings).length > 0;

  // Stops the timer when the card goes away
  useEffect(
    () => () => {
      if (addedTimer.current) clearTimeout(addedTimer.current);
    },
    [],
  );

  // Fills the fields from an entry typed often; its amount only when it repeats
  const pick = (entry: FrequentEntry) => {
    setCategoryChoice(entry.categoryId);
    setAccountChoice(entry.accountId);
    setCurrencyChoice(entry.currency);
    setNote(entry.note);
    if (entry.amount !== null) setAmount(String(entry.amount));
  };
  // Switches between income and expense, back to the type's first category
  const switchType = (next: QuickType) => {
    setType(next);
    setCategoryChoice(null);
  };

  // Adds the entry for today and clears the amount and note
  const submit = () => {
    if (!valid) return;
    const date = todayISO();
    update((s) => addQuickEntry(s, { type, amount: parsed, currency, categoryId, accountId, note, date }, uid));
    setAmount("");
    setNote("");
    setAdded(true);
    if (addedTimer.current) clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(false), ADDED_MS);
  };

  return (
    <Card
      title={t("dash.quick")}
      icon="bolt"
      action={
        <SegmentedControl<QuickType>
          size="sm"
          label={t("tx.kind")}
          options={[
            { value: "expense", label: t("tx.type.expense") },
            { value: "income", label: t("tx.type.income") },
          ]}
          value={type}
          onChange={switchType}
        />
      }
    >
      <div className={styles.frequent}>
        <FrequentChips entries={frequentEntries(state, type, todayISO(), QUICK_FREQUENT)} onPick={pick} />
      </div>
      <div className={styles.grid}>
        <div className={styles.amount}>
          <MoneyField
            label={t("common.amount")}
            value={amount}
            onChange={setAmount}
            currency={currency}
            onCurrency={setCurrencyChoice}
            currencyLabel={t("common.currency")}
            currencies={currencies}
          />
        </div>
        <div className={cx(hasAccounts ? styles.half : styles.wide)}>
          <Field label={t("common.category")}>
            <OptionPicker
              label={t("common.category")}
              value={categoryId}
              onChange={setCategoryChoice}
              groups={type === "income" ? incomeGroups : expenseGroups}
            />
          </Field>
        </div>
        {hasAccounts && (
          <div className={styles.half}>
            <Field label={t("common.account")}>
              <OptionPicker
                label={t("common.account")}
                value={accountId}
                onChange={(next) => {
                  setAccountChoice(next);
                  setCurrencyChoice(null);
                }}
                groups={accountGroups}
              />
            </Field>
          </div>
        )}
        <div className={styles.wide}>
          <Field label={t("common.note")}>
            <TextInput
              placeholder={t("common.optional")}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
        </div>
        <div className={styles.submit}>
          <Button className={styles.button} onClick={submit} disabled={!valid}>
            {added ? t("dash.quick.added") : t("dash.quick.add")}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default QuickAddCard;
