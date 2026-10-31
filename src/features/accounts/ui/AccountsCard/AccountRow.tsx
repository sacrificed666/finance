"use client";

import { useStore } from "@/app/hooks";
import { balanceTrail } from "@/features/accounts/model/balanceTrail";
import { brandInfo } from "@/features/accounts/model/brands";
import { gameLabel } from "@/features/accounts/model/games";
import { graceDue } from "@/features/accounts/model/grace";
import { holdingsSummary } from "@/features/accounts/model/holdings";
import { accountColorSlot } from "@/features/accounts/model/kinds";
import AccountMark from "@/features/accounts/ui/AccountMark/AccountMark";
import { displayCurrencies } from "@/features/data/model/currencies";
import type { SavingsAccount } from "@/features/data/model/types";
import { useI18n } from "@/shared/i18n/useI18n";
import { seriesColor } from "@/shared/lib/chart";
import { cx } from "@/shared/lib/cx";
import { formatDate, formatDateShort, formatDateTime, todayISO } from "@/shared/lib/date";
import { convert, formatMoney, formatPercent } from "@/shared/lib/money";
import IconDisc from "@/shared/ui/IconDisc/IconDisc";
import ProgressMeter from "@/shared/ui/ProgressMeter/ProgressMeter";
import SparkArea from "@/shared/ui/SparkArea/SparkArea";

import styles from "./AccountsCard.module.scss";

interface AccountRowProps {
  account: SavingsAccount;
  balance: number;
  onEdit: (account: SavingsAccount) => void;
}

// One account as a card of its kind's colour: name, mark, balance and its goal
const AccountRow = ({ account, balance, onEdit }: AccountRowProps) => {
  const { state } = useStore();
  const { t } = useI18n();
  const { goal } = account;
  const reached = goal !== undefined && balance >= goal.target;
  const game = account.kind === "skins" ? gameLabel(account.game, account.gameName) : undefined;
  const crypto = account.kind === "crypto" && Boolean(account.holdings?.length);
  const trail = balanceTrail(account, state, todayISO());
  const moved = Math.max(...trail) - Math.min(...trail) > 0.5;
  // The tooltip of the goal: reached, or how far with the deadline
  const goalTitle = () => {
    if (!goal) return;
    if (reached) return t("balance.goal.reached");
    return [
      t("balance.goal.progress", {
        have: formatMoney(balance, account.currency),
        target: formatMoney(goal.target, account.currency),
        pct: formatPercent((balance / goal.target) * 100, 0),
      }),
      goal.deadline ? t("balance.goal.by", { date: formatDate(goal.deadline) }) : null,
    ]
      .filter(Boolean)
      .join(" · ");
  };

  const others = displayCurrencies(state).filter((currency) => currency !== account.currency);
  const grace = graceDue(state, account, todayISO());
  const slot = accountColorSlot(account.kind);

  return (
    <button
      type="button"
      onClick={() => onEdit(account)}
      className={cx(styles.card, account.archived && styles.archived)}
      style={{ "--tint": seriesColor(slot) }}
    >
      <span className={styles.top}>
        <span className={styles.text}>
          <span className={styles.name}>{account.name}</span>
          <span className={styles.meta}>
            {[
              account.archived ? t("balance.acc.archivedTag") : null,
              t(`accountKind.${account.kind}`),
              brandInfo(account.bank)?.name ?? game,
              account.currency,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
          {crypto && (
            <span
              className={styles.coins}
              title={
                account.pricedAt ? t("balance.prices.pricedAt", { when: formatDateTime(account.pricedAt) }) : undefined
              }
            >
              {holdingsSummary(account.holdings)}
            </span>
          )}
        </span>
        <IconDisc colorSlot={slot} size="lg">
          <AccountMark account={account} />
        </IconDisc>
      </span>
      {moved && (
        <span className={styles.trail}>
          <SparkArea values={trail} tone="accent" height={34} />
        </span>
      )}
      <span className={styles.balance}>{formatMoney(balance, account.currency, { exact: true })}</span>
      {others.length > 0 && (
        <span className={styles.others}>
          {others
            .map((currency) =>
              formatMoney(convert(balance, account.currency, currency, state.settings.rates), currency, {
                exact: true,
              }),
            )
            .join(" · ")}
        </span>
      )}
      {grace && (
        <span className={styles.grace}>
          {t("balance.credit.repay", {
            amount: formatMoney(grace.amount, account.currency),
            date: formatDateShort(grace.due),
          })}
        </span>
      )}
      {goal && (
        <span className={styles.goal} title={goalTitle()}>
          <span className={styles.goalMeter}>
            <ProgressMeter value={balance} max={goal.target} label={t("balance.goal.label", { name: account.name })} />
          </span>
          <span className={cx(styles.goalText, reached && styles.reached)}>
            {reached
              ? t("balance.goal.reached")
              : t("balance.goal.aim", { amount: formatMoney(goal.target, account.currency, { compact: true }) })}
          </span>
        </span>
      )}
    </button>
  );
};

export default AccountRow;
