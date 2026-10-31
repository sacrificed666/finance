"use client";

import { useStore } from "@/app/hooks";
import { debtColorSlot } from "@/features/accounts/model/kinds";
import { debtPayoff } from "@/features/data/model/finmath";
import type { Debt } from "@/features/data/model/types";
import { genitiveMonths } from "@/shared/i18n/monthCase";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatMonthText } from "@/shared/lib/date";
import { convert, formatMoney, formatPercent } from "@/shared/lib/money";
import IconDisc from "@/shared/ui/IconDisc/IconDisc";
import ProgressMeter from "@/shared/ui/ProgressMeter/ProgressMeter";

import styles from "./DebtsCard.module.scss";

interface DebtRowProps {
  debt: Debt;
  month: string;
  onEdit: (debt: Debt) => void;
}

// One debt: its kind and rate, what is left, the part paid off and when it ends
const DebtRow = ({ debt, month, onEdit }: DebtRowProps) => {
  const { state } = useStore();
  const { t, tp, intl } = useI18n();
  const { settings } = state;
  const principal = debt.principal ?? 0;
  const paid = Math.max(0, principal - debt.balance);
  const payoff = debtPayoff(debt, month);
  // A short amount in the debt's currency
  const money = (amount: number) => formatMoney(amount, debt.currency, { compact: true });

  return (
    <button type="button" onClick={() => onEdit(debt)} className={styles.row}>
      <span className={styles.line}>
        <span className={styles.who}>
          <IconDisc colorSlot={debtColorSlot(debt.kind)} size="lg">
            {debt.icon}
          </IconDisc>
          <span className={styles.text}>
            <span className={styles.name}>{debt.name}</span>
            <span className={styles.kind}>
              {t(`debtKind.${debt.kind}`)}
              {debt.annualRatePct ? ` · ${t("balance.perYear", { pct: formatPercent(debt.annualRatePct) })}` : ""}
            </span>
          </span>
        </span>
        <span className={styles.amounts}>
          <span className={styles.balance}>−{formatMoney(debt.balance, debt.currency, { exact: true })}</span>
          {debt.currency !== settings.baseCurrency && (
            <span className={styles.converted}>
              {`−${formatMoney(convert(debt.balance, debt.currency, settings.baseCurrency, settings.rates), settings.baseCurrency, { compact: true })}`}
            </span>
          )}
        </span>
      </span>
      {principal > 0 && (
        <span className={styles.progress}>
          <ProgressMeter value={paid} max={principal} label={t("balance.debt.paidLabel", { name: debt.name })} />
          <span className={styles.paid}>
            {t("balance.debt.paidOff", {
              paid: money(paid),
              principal: money(principal),
              pct: formatPercent((paid / principal) * 100, 0),
            })}
            {debt.monthlyPayment ? ` · ${money(debt.monthlyPayment)}${t("common.perMonth")}` : ""}
          </span>
        </span>
      )}
      {payoff && (
        <span className={styles.payoff}>
          {payoff.neverPaysOff ? (
            <span className={styles.never}>{t("balance.debt.neverPaysOff")}</span>
          ) : (
            <span className={styles.clear}>
              {t("balance.debt.clearBy")}{" "}
              <span className={styles.month}>{genitiveMonths(formatMonthText(payoff.finalMonth), intl)}</span>
              {" · "}
              {tp("balance.debt.payments", payoff.months)}
              {payoff.interest > 0.5 && ` · ${t("balance.debt.interestLeft", { amount: money(payoff.interest) })}`}
            </span>
          )}
        </span>
      )}
    </button>
  );
};

export default DebtRow;
