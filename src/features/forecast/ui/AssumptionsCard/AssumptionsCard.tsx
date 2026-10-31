"use client";

import type { Forecast, ForecastControls } from "@/features/forecast/model/forecast";
import { useI18n } from "@/shared/i18n/useI18n";
import { CURRENCY_SYMBOL, formatMoney, formatPercent } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";
import Slider from "@/shared/ui/Slider/Slider";
import SwitchRow from "@/shared/ui/SwitchRow/SwitchRow";

import SliderRow from "./SliderRow";

import styles from "./AssumptionsCard.module.scss";

interface AssumptionsCardProps {
  f: Forecast;
  controls: ForecastControls;
  onChange: (fields: Partial<ForecastControls>) => void;
}

// The horizon, return and spread of the forecast, and what it counts in
const AssumptionsCard = ({ f, controls, onChange }: AssumptionsCardProps) => {
  const { t, tp } = useI18n();
  const { inflationMix, kept, base } = f;
  // A short amount in the base currency
  const money = (amount: number) => formatMoney(amount, base, { compact: true });
  const shares = inflationMix.shares && inflationMix.shares.length > 1 ? inflationMix.shares : null;

  return (
    <Card title={t("forecast.assumptions")} subtitle={t("forecast.assumptions.subtitle")} icon="sliders">
      <div className={styles.grid}>
        <SliderRow
          label={t("forecast.horizon")}
          value={tp("forecast.years", controls.years)}
          hint={t("forecast.horizon.hint")}
        >
          <Slider
            min={1}
            max={40}
            value={controls.years}
            onChange={(years) => onChange({ years })}
            label={t("forecast.horizon")}
          />
        </SliderRow>
        <SliderRow
          label={t("forecast.return")}
          value={t("balance.perYear", { pct: formatPercent(controls.returnPct) })}
          hint={t("forecast.return.hint")}
        >
          <Slider
            min={0}
            max={25}
            step={0.5}
            value={controls.returnPct}
            onChange={(returnPct) => onChange({ returnPct })}
            label={t("forecast.return")}
          />
        </SliderRow>
        <SliderRow
          label={t("forecast.spread")}
          value={`±${formatPercent(controls.spreadPct)}`}
          hint={t("forecast.spread.hint")}
        >
          <Slider
            min={0}
            max={10}
            step={0.5}
            value={controls.spreadPct}
            onChange={(spreadPct) => onChange({ spreadPct })}
            label={t("forecast.spread")}
          />
        </SliderRow>

        <SwitchRow
          className={styles.toggle}
          title={t("forecast.saving")}
          hint={[
            kept.topUps > 0
              ? t("forecast.saving.hintTopUps", {
                  amount: money(kept.toAccounts),
                  average: money(kept.average),
                  topUps: money(kept.topUps),
                })
              : t("forecast.saving.hint", { amount: money(kept.toAccounts) }),
            Math.abs(f.scheduleShift) >= 1
              ? t("forecast.saving.schedules", {
                  amount: formatMoney(f.scheduleShift, base, { compact: true, sign: true }),
                })
              : null,
          ]
            .filter(Boolean)
            .join(". ")}
          checked={controls.withSaving}
          onChange={(withSaving) => onChange({ withSaving })}
        />

        <SwitchRow
          className={styles.toggle}
          title={t("forecast.real")}
          hint={
            <>
              {t("forecast.real.hint", { pct: formatPercent(inflationMix.pct, 1) })}
              {shares && (
                <>
                  {": "}
                  {shares
                    .map((entry) => `${formatPercent(entry.share * 100, 0)} ${CURRENCY_SYMBOL[entry.currency]}`)
                    .join(" · ")}
                </>
              )}
            </>
          }
          checked={controls.inflationOn}
          onChange={(inflationOn) => onChange({ inflationOn })}
        />

        {f.state.debts.length > 0 && (
          <SwitchRow
            className={styles.toggle}
            title={t("forecast.debts")}
            hint={t("forecast.debts.hint")}
            checked={controls.withDebts}
            onChange={(withDebts) => onChange({ withDebts })}
          />
        )}
      </div>
    </Card>
  );
};

export default AssumptionsCard;
