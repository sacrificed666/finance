"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import { payoffDebts } from "@/features/accounts/model/debts";
import { debtColorSlot } from "@/features/accounts/model/kinds";
import { planPayoff, type PayoffPlan, type PayoffStrategy } from "@/features/accounts/model/payoff";
import { useI18n } from "@/shared/i18n/useI18n";
import { currentMonth, formatMonthText } from "@/shared/lib/date";
import { CURRENCY_SYMBOL, formatMoney, parseAmount } from "@/shared/lib/money";
import Button from "@/shared/ui/Button/Button";
import Fact from "@/shared/ui/Fact/Fact";
import Facts from "@/shared/ui/Facts/Facts";
import Field from "@/shared/ui/Field/Field";
import IconDisc from "@/shared/ui/IconDisc/IconDisc";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";
import Sheet from "@/shared/ui/Sheet/Sheet";
import SummaryPanel from "@/shared/ui/SummaryPanel/SummaryPanel";
import TextInput from "@/shared/ui/TextInput/TextInput";

import styles from "./PayoffSheet.module.scss";

interface PayoffSheetProps {
  onClose: () => void;
}

// Plans paying the debts off faster with an extra amount, by rate or by size
const PayoffSheet = ({ onClose }: PayoffSheetProps) => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const base = state.settings.baseCurrency;
  const from = currentMonth();
  const [extra, setExtra] = useState("");
  const [strategy, setStrategy] = useState<PayoffStrategy>("avalanche");
  const debts = payoffDebts(state);
  const typed = parseAmount(extra);
  const asSet = planPayoff(debts, from);
  const plan = planPayoff(debts, from, { extra: Number.isFinite(typed) ? typed : 0, strategy });
  const comparable = !asSet.neverPaysOff && !plan.neverPaysOff;
  const savedInterest = comparable ? asSet.interest - plan.interest : 0;
  const savedMonths = comparable ? asSet.months - plan.months : 0;
  const unpaid = state.debts.filter((debt) => debt.balance > 0 && !plan.cleared.some((item) => item.id === debt.id));
  // A short amount in the base currency
  const money = (amount: number) => formatMoney(amount, base, { compact: true });
  // When a plan ends, or that it never does
  const summary = (result: PayoffPlan) =>
    result.neverPaysOff ? t("payoff.never") : t("payoff.freeBy", { month: formatMonthText(result.finalMonth) });

  return (
    <Sheet
      open
      onClose={onClose}
      title={t("payoff.title")}
      footer={<Button onClick={onClose}>{t("dash.layout.done")}</Button>}
    >
      <p className={styles.hint}>{t("payoff.hint")}</p>
      <Field label={t("payoff.extra")} hint={t("payoff.extra.hint")}>
        <TextInput
          inputMode="decimal"
          prefix={CURRENCY_SYMBOL[base]}
          value={extra}
          onChange={(event) => setExtra(event.target.value)}
          placeholder="0"
        />
      </Field>
      <SegmentedControl<PayoffStrategy>
        label={t("payoff.strategy")}
        options={[
          { value: "avalanche", label: t("payoff.avalanche") },
          { value: "snowball", label: t("payoff.snowball") },
        ]}
        value={strategy}
        onChange={setStrategy}
      />
      <p className={styles.caption}>
        {strategy === "avalanche" ? t("payoff.avalanche.hint") : t("payoff.snowball.hint")}
      </p>

      <Facts>
        <Fact label={t("payoff.asSet")}>
          <span className={styles.block}>{summary(asSet)}</span>
          {!asSet.neverPaysOff && (
            <span className={styles.interest}>{t("payoff.interest", { amount: money(asSet.interest) })}</span>
          )}
        </Fact>
        <Fact label={t("payoff.plan")}>
          <span className={styles.block}>{summary(plan)}</span>
          {!plan.neverPaysOff && (
            <span className={styles.interest}>{t("payoff.interest", { amount: money(plan.interest) })}</span>
          )}
        </Fact>
      </Facts>

      {(savedInterest > 0.5 || savedMonths > 0) && (
        <SummaryPanel tone="income" value={money(savedInterest)} meta={tp("payoff.savesMonths", savedMonths)}>
          <p className={styles.caption}>{t("payoff.saves")}</p>
        </SummaryPanel>
      )}

      <section className={styles.order}>
        <h3 className={styles.caption}>{t("payoff.order")}</h3>
        <ol className={styles.rows}>
          {plan.cleared.map((item, index) => {
            const debt = state.debts.find((entry) => entry.id === item.id);
            if (!debt) return null;
            return (
              <li key={item.id} className={styles.row}>
                <span className={styles.place}>{index + 1}</span>
                <IconDisc colorSlot={debtColorSlot(debt.kind)} size="md">
                  {debt.icon}
                </IconDisc>
                <span className={styles.name}>{debt.name}</span>
                <span className={styles.clears}>{t("payoff.clears", { month: formatMonthText(item.month) })}</span>
              </li>
            );
          })}
          {unpaid.map((debt) => (
            <li key={debt.id} className={styles.row}>
              <span className={styles.place} />
              <IconDisc colorSlot={debtColorSlot(debt.kind)} size="md">
                {debt.icon}
              </IconDisc>
              <span className={styles.name}>{debt.name}</span>
              <span className={styles.stuck}>{t("payoff.stuck")}</span>
            </li>
          ))}
        </ol>
      </section>
      <p className={styles.caption}>{t("payoff.note", { currency: base })}</p>
    </Sheet>
  );
};

export default PayoffSheet;
