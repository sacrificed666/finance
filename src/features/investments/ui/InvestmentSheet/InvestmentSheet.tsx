"use client";

import { useEffect, useEffectEvent, useState } from "react";

import { useStore } from "@/app/hooks";
import { COINS } from "@/features/accounts/model/coins";
import type { Investment } from "@/features/data/model/types";
import { fetchInzhurQuotes, type InzhurQuote } from "@/features/investments/api/inzhur";
import {
  initialInvestmentForm,
  investmentProblem,
  isCounted,
  renewInvestmentForm,
  saveInvestment,
  switchFund,
  switchInvestmentKind,
  withQuote,
  type InvestmentForm,
} from "@/features/investments/model/investmentForm";
import { INVESTMENT_KINDS, valuationOf } from "@/features/investments/model/kinds";
import { useI18n } from "@/shared/i18n/useI18n";
import { todayISO } from "@/shared/lib/date";
import { CURRENCY_OPTIONS, CURRENCY_SYMBOL } from "@/shared/lib/money";
import { uid } from "@/shared/lib/uid";
import Button from "@/shared/ui/Button/Button";
import DateField from "@/shared/ui/DateField/DateField";
import Field from "@/shared/ui/Field/Field";
import FieldSet from "@/shared/ui/FieldSet/FieldSet";
import FormRow from "@/shared/ui/FormRow/FormRow";
import MoneyField from "@/shared/ui/MoneyField/MoneyField";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";
import Select from "@/shared/ui/Select/Select";
import Sheet from "@/shared/ui/Sheet/Sheet";
import TextInput from "@/shared/ui/TextInput/TextInput";

import InzhurFields from "./InzhurFields";
import ReturnFields from "./ReturnFields";

import styles from "./InvestmentSheet.module.scss";

interface InvestmentSheetProps {
  target: Investment | "new";
  renew?: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}

// What asking for a fund's price came to
type NavResult = { quote: InzhurQuote; fetchedAt: string } | "missing" | "failed";

// A fund's latest price from the app's own server
const fetchNav = async (fundId: string): Promise<NavResult> => {
  try {
    const answer = await fetchInzhurQuotes([fundId]);
    const quote = answer.quotes.find((item) => item.id === fundId);
    return quote ? { quote, fetchedAt: answer.fetchedAt } : "missing";
  } catch {
    return "failed";
  }
};

// The form a sheet opens with: a stored position, a renewed term or a new one
const openingForm = (target: Investment | "new", renew: boolean): InvestmentForm => {
  const today = todayISO();
  if (renew && target !== "new" && target.endDate) {
    return renewInvestmentForm({ ...target, endDate: target.endDate }, today);
  }
  return initialInvestmentForm(target, today);
};

// Adds, edits or renews a position: its kind, amounts, dates and returns
const InvestmentSheet = ({ target, renew = false, onClose, onDelete }: InvestmentSheetProps) => {
  const { update } = useStore();
  const { t } = useI18n();
  const [form, setForm] = useState<InvestmentForm>(() => openingForm(target, renew));
  const storedFund = target !== "new" && target.kind === "inzhur" ? target.fund : undefined;
  const [navLoading, setNavLoading] = useState(storedFund !== undefined);
  const [navError, setNavError] = useState<string | null>(null);
  const problem = investmentProblem(form);
  const market = valuationOf(form.kind) === "market";
  const crypto = form.kind === "crypto";
  const inzhur = form.kind === "inzhur";
  const id = form.id;
  const symbol = CURRENCY_SYMBOL[form.currency];
  // Changes some fields of the form
  const change = (fields: Partial<InvestmentForm>) => setForm((current) => ({ ...current, ...fields }));

  // Shows a fund's price, or why it did not come
  const settle = (fundId: string, result: NavResult) => {
    if (result === "missing") setNavError(t("balance.inv.inzhur.noQuote"));
    else if (result === "failed") setNavError(t("balance.prices.inzhurFailed"));
    else setForm((current) => withQuote(current, fundId, result.quote, result.fetchedAt));
  };

  // Loads a fund's price on request
  const loadNav = async (fundId: string) => {
    setNavLoading(true);
    setNavError(null);
    settle(fundId, await fetchNav(fundId));
    setNavLoading(false);
  };

  // Loads the stored fund's price when the sheet opens, unless it closes first
  const openNav = useEffectEvent((fundId: string) => {
    let live = true;
    void fetchNav(fundId).then((result) => {
      if (!live) return;
      settle(fundId, result);
      setNavLoading(false);
    });
    return () => {
      live = false;
    };
  });

  useEffect(() => {
    if (!storedFund) return;
    return openNav(storedFund);
  }, [storedFund]);

  // Switches the kind; turning into an Inzhur position loads its fund's price
  const changeKind = (value: string) => {
    const kind = INVESTMENT_KINDS.find((item) => item.value === value)?.value;
    if (!kind) return;
    const next = switchInvestmentKind(form, kind);
    setForm(next);
    if (kind === "inzhur" && form.kind !== "inzhur") void loadNav(next.fund);
  };

  // Picks another fund and loads its price
  const changeFund = (fundId: string) => {
    setForm(switchFund(form, fundId));
    void loadNav(fundId);
  };

  // Saves the position and closes the sheet
  const submit = () => {
    if (problem) return;
    const now = new Date().toISOString();
    update((state) => saveInvestment(state, form, uid, now));
    onClose();
  };

  let title = t("balance.inv.new");
  if (renew) title = t("investments.renew.title");
  else if (id) title = t("balance.inv.edit");

  return (
    <Sheet
      open
      onClose={onClose}
      onSubmit={submit}
      problem={problem && t(problem)}
      title={title}
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
      <Field label={t("balance.inv.type")} hint={t(`investmentKind.${form.kind}.hint`)}>
        <Select value={form.kind} onChange={(event) => changeKind(event.target.value)}>
          {INVESTMENT_KINDS.map((kind) => (
            <option key={kind.value} value={kind.value}>
              {kind.icon} {t(`investmentKind.${kind.value}`)}
            </option>
          ))}
        </Select>
      </Field>

      {inzhur && (
        <InzhurFields
          form={form}
          loading={navLoading}
          error={navError}
          onFund={changeFund}
          onLoad={() => void loadNav(form.fund)}
        />
      )}

      <Field label={t("common.name")}>
        <TextInput
          value={form.name}
          onChange={(event) => change({ name: event.target.value })}
          placeholder={t("common.example", {
            value: crypto ? t("balance.inv.placeholder.crypto") : t("balance.inv.placeholder.bonds"),
          })}
        />
      </Field>
      {inzhur && (
        <FieldSet label={t("common.currency")} hint={t("balance.inv.inzhur.currency.hint")}>
          <SegmentedControl
            label={t("common.currency")}
            options={CURRENCY_OPTIONS}
            value={form.currency}
            onChange={(currency) => change({ currency })}
          />
        </FieldSet>
      )}

      {crypto && (
        <FormRow>
          <Field label={t("balance.inv.coin")}>
            <Select value={form.coin} onChange={(event) => change({ coin: event.target.value })}>
              {COINS.map((coin) => (
                <option key={coin.id} value={coin.id}>
                  {coin.symbol} · {coin.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("balance.inv.howMany")} hint={t("balance.inv.howMany.hint")}>
            <TextInput
              inputMode="decimal"
              value={form.quantity}
              onChange={(event) => change({ quantity: event.target.value })}
              placeholder={t("common.example", { value: "0.25" })}
            />
          </Field>
        </FormRow>
      )}

      {inzhur && (
        <Field label={t("balance.inv.inzhur.certificates")} hint={t("balance.inv.inzhur.certificates.hint")}>
          <TextInput
            inputMode="decimal"
            value={form.quantity}
            onChange={(event) => change({ quantity: event.target.value })}
            placeholder={t("common.example", { value: "1000" })}
          />
        </Field>
      )}

      <MoneyField
        label={market ? t("balance.inv.paid") : t("balance.inv.principal")}
        hint={market ? t("balance.inv.paid.hint") : undefined}
        value={form.principal}
        onChange={(principal) => change({ principal })}
        currency={form.currency}
        onCurrency={(currency) => change({ currency })}
        currencyLabel={t("common.currency")}
        currencies={inzhur ? [form.currency] : undefined}
        hero
      />

      {market && !isCounted(form.kind) && (
        <Field label={t("balance.inv.worthToday")} hint={t("balance.inv.worthToday.hint")}>
          <TextInput
            inputMode="decimal"
            prefix={symbol}
            value={form.marketValue}
            onChange={(event) => change({ marketValue: event.target.value })}
            placeholder={form.principal || "0"}
          />
        </Field>
      )}

      {!inzhur && (
        <Field
          label={market ? t("balance.inv.expected") : t("balance.inv.rate")}
          hint={market ? t("balance.inv.expected.hint") : t("balance.inv.rate.hint")}
        >
          <TextInput
            inputMode="decimal"
            value={form.rate}
            onChange={(event) => change({ rate: event.target.value })}
            placeholder={market ? "0" : t("common.example", { value: "15.3" })}
          />
        </Field>
      )}

      <FormRow>
        <Field label={market ? t("balance.inv.boughtOn") : t("balance.inv.startDate")}>
          <DateField value={form.startDate} onChange={(value) => change({ startDate: value })} />
        </Field>
        <Field label={market ? t("balance.inv.heldUntil") : t("balance.inv.matures")} hint={t("balance.inv.end.hint")}>
          <DateField
            allowEmpty
            value={form.endDate}
            min={form.startDate || undefined}
            onChange={(value) => change({ endDate: value })}
          />
        </Field>
      </FormRow>

      <ReturnFields form={form} onChange={change} />

      <Field label={t("balance.inv.topUp")} hint={market ? t("balance.inv.topUp.marketHint") : t("common.optional")}>
        <TextInput
          inputMode="decimal"
          prefix={symbol}
          value={form.contribution}
          onChange={(event) => change({ contribution: event.target.value })}
          placeholder="0"
        />
      </Field>
      <Field label={t("common.note")}>
        <TextInput
          value={form.note}
          onChange={(event) => change({ note: event.target.value })}
          placeholder={t("common.optional")}
        />
      </Field>
      {id && !renew && (
        <Button variant="danger" className={styles.delete} onClick={() => onDelete(id)}>
          {t("balance.inv.delete")}
        </Button>
      )}
    </Sheet>
  );
};

export default InvestmentSheet;
