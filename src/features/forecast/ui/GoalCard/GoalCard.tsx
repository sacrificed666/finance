"use client";

import { useState } from "react";

import { displayCurrencies } from "@/features/data/model/currencies";
import type { Forecast } from "@/features/forecast/model/forecast";
import { goalPlan, goalPresets, milestones, positiveAmount } from "@/features/forecast/model/goal";
import { useI18n } from "@/shared/i18n/useI18n";
import { addMonths, formatMonthCompact } from "@/shared/lib/date";
import { convert, formatMoney, formatPercent, type Currency } from "@/shared/lib/money";
import Button from "@/shared/ui/Button/Button";
import Card from "@/shared/ui/Card/Card";
import Icon from "@/shared/ui/Icon/Icon";
import MoneyField from "@/shared/ui/MoneyField/MoneyField";
import MonthInput from "@/shared/ui/MonthInput/MonthInput";
import ProgressMeter from "@/shared/ui/ProgressMeter/ProgressMeter";

import styles from "./GoalCard.module.scss";

// A short amount in a currency
const money = (value: number, unit: Currency) => formatMoney(value, unit, { compact: true });

interface GoalCardProps {
  f: Forecast;
  years: number;
  returnPct: number;
}

// When the money reaches a target, and what reaching it by a date takes
const GoalCard = ({ f, years, returnPct }: GoalCardProps) => {
  const { t, tp } = useI18n();
  const { base, view, assetsNow } = f;
  const { rates } = f.state.settings;
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>(base);
  const [by, setBy] = useState(addMonths(f.startMonth, 36));
  const goal = convert(positiveAmount(amount), currency, base, rates);
  const plan = goalPlan(f, goal, by, returnPct);
  const passes = milestones(f);
  const open = goal > 0 && !plan.reached;

  // The outcome: done already, the month it is reached, or not in time
  const outcome = () => {
    if (plan.reached) {
      return (
        <>
          <span aria-hidden className={styles.check}>
            <Icon name="check" size={20} strokeWidth={2.6} />
          </span>
          <p className={styles.there}>{t("forecast.goal.there")}</p>
        </>
      );
    }
    if (plan.hitMonth) {
      return (
        <>
          <p className={styles.reachedTitle}>{t("forecast.goal.reached")}</p>
          <p className={styles.month}>{formatMonthCompact(plan.hitMonth)}</p>
          <p className={styles.small}>{tp("forecast.goal.inMonths", plan.hitIndex)}</p>
        </>
      );
    }
    return (
      <>
        <p className={styles.missed}>{tp("forecast.goal.notWithin", years)}</p>
        <p className={styles.small}>{t("forecast.goal.notWithin.hint")}</p>
      </>
    );
  };

  return (
    <Card title={t("forecast.goal")} subtitle={t("forecast.goal.subtitle")} icon="target">
      <div className={styles.fields}>
        <MoneyField
          label={t("balance.goal.target")}
          value={amount}
          onChange={setAmount}
          currency={currency}
          onCurrency={setCurrency}
          currencyLabel={t("common.currency")}
          currencies={displayCurrencies(f.state)}
        />
      </div>

      <div className={styles.presets}>
        {goalPresets(f, currency).map((preset) => (
          <Button key={preset} variant="ghost" size="sm" onClick={() => setAmount(String(preset))}>
            {money(preset, currency)}
          </Button>
        ))}
      </div>

      {open && (
        <div className={styles.progress}>
          <div className={styles.progressHead}>
            <span className={styles.progressLabel}>{t("forecast.goal.progress")}</span>
            <span className={styles.progressShare}>{formatPercent(Math.min(100, (assetsNow / goal) * 100), 0)}</span>
          </div>
          <ProgressMeter
            value={assetsNow}
            max={goal}
            label={t("forecast.goal.progressTo", { amount: money(goal, base) })}
          />
        </div>
      )}

      {goal > 0 && <div className={styles.outcome}>{outcome()}</div>}

      {open && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>{t("forecast.goal.byWhen")}</p>
          <MonthInput name={t("forecast.goal.byWhen")} value={by} onChange={setBy} />
          <p className={styles.needed}>
            {plan.neededMonthly
              ? t("forecast.goal.needMonthly", {
                  amount: money(convert(plan.neededMonthly, base, view, rates), view),
                  months: plan.months,
                })
              : t("forecast.goal.alreadyOnTrack")}
          </p>
        </div>
      )}

      {passes.length > 0 && (
        <div className={styles.section}>
          <p className={styles.milestonesTitle}>{t("forecast.milestones")}</p>
          <ul className={styles.milestones}>
            {passes.map((pass) => (
              <li key={pass.amount} className={styles.milestone}>
                <span className={styles.amount}>{money(pass.amount, view)}</span>
                <span className={styles.when}>{formatMonthCompact(pass.month)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
};

export default GoalCard;
