"use client";

import { useStore } from "@/app/hooks";
import { incomeFigures, type IncomeForm } from "@/features/income/model/incomeForm";
import TripleMoney from "@/features/income/ui/TripleMoney/TripleMoney";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatMoney, formatPercent } from "@/shared/lib/money";

import styles from "./IncomeSheet.module.scss";

interface NetPreviewProps {
  form: IncomeForm;
}

interface LineProps {
  label: string;
  value: string;
  expense?: boolean;
}

// One line of the tax breakdown, a deduction in red
const Line = ({ label, value, expense = false }: LineProps) => (
  <div className={styles.line}>
    <dt className={styles.lineLabel}>{label}</dt>
    <dd className={cx(styles.lineValue, expense && styles.deduction)}>{value}</dd>
  </div>
);

// What the income leaves after its taxes, part by part, and in every currency
const NetPreview = ({ form }: NetPreviewProps) => {
  const { state } = useStore();
  const { t } = useI18n();
  const { settings } = state;
  const { profile, breakdown, net } = incomeFigures(form, settings);
  // An exact amount in the form's currency
  const money = (amount: number) => formatMoney(amount, form.currency, { exact: true });
  return (
    <div className={styles.preview}>
      {breakdown && (
        <dl className={styles.breakdown}>
          <Line label={t("income.gross")} value={money(breakdown.gross)} />
          {breakdown.vat > 0 && (
            <Line
              label={t("income.vat", { pct: formatPercent(profile?.vatPct ?? 0) })}
              value={`−${money(breakdown.vat)}`}
              expense
            />
          )}
          {breakdown.percentPart > 0 && (
            <Line
              label={t("income.percentPart", { pct: formatPercent(profile?.ratePct ?? 0) })}
              value={`−${money(breakdown.percentPart)}`}
              expense
            />
          )}
          {breakdown.fixedPart > 0 && (
            <Line label={t("income.fixedPart")} value={`−${money(breakdown.fixedPart)}`} expense />
          )}
          <Line label={t("income.effectiveRate")} value={formatPercent(breakdown.effectivePct)} />
        </dl>
      )}
      <p className={styles.netLabel}>{breakdown ? t("income.netTakeHome") : t("income.everyCurrency")}</p>
      <TripleMoney amount={net} currency={form.currency} settings={settings} />
    </div>
  );
};

export default NetPreview;
