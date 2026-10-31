"use client";

import type { ReactNode } from "react";

import { useStore } from "@/app/hooks";
import { goalsSummary, type GoalProgress } from "@/features/accounts/model/goals";
import { accountColorSlot } from "@/features/accounts/model/kinds";
import AccountMark from "@/features/accounts/ui/AccountMark/AccountMark";
import type { Goal } from "@/features/data/model/types";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatDate, todayISO } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import AddButton from "@/shared/ui/AddButton/AddButton";
import Card from "@/shared/ui/Card/Card";
import IconDisc from "@/shared/ui/IconDisc/IconDisc";
import ProgressMeter from "@/shared/ui/ProgressMeter/ProgressMeter";

import styles from "./GoalsCard.module.scss";

// How many unfinished goals the card lists
const SHOWN = 4;

// The colour slot of goals of their own, beside the colours of account kinds
const GOAL_SLOT = 6;

interface GoalsCardProps {
  onAdd: () => void;
  onEdit: (goal: Goal) => void;
}

// The goals closest to done with what each still needs; the total is in the hero
const GoalsCard = ({ onAdd, onEdit }: GoalsCardProps) => {
  const { state } = useStore();
  const { t } = useI18n();
  const base = state.settings.baseCurrency;
  const { goals, reached, perMonth } = goalsSummary(state, todayISO());
  if (goals.length === 0) return null;
  const closest = goals
    .filter((goal) => goal.progress < 1)
    .toSorted((a, b) => b.progress - a.progress)
    .slice(0, SHOWN);
  const done = goals.filter((goal) => goal.progress >= 1 && goal.goal);
  const monthly = perMonth > 0.5 && (
    <p className={styles.monthly}>
      {t("balance.goals.monthly", { amount: formatMoney(perMonth, base, { compact: true }) })}
    </p>
  );

  // One goal as a row; a goal of its own opens to be changed
  const row = (item: GoalProgress) => {
    const content: ReactNode = (
      <>
        <IconDisc colorSlot={item.account ? accountColorSlot(item.account.kind) : GOAL_SLOT} size="md">
          {item.account ? <AccountMark account={item.account} /> : item.goal?.icon}
        </IconDisc>
        <span className={styles.body}>
          <span className={styles.head}>
            <span className={styles.name}>{item.name}</span>
            <span className={styles.share}>
              {item.progress >= 1
                ? t("balance.goal.reached")
                : t("balance.goal.toGo", {
                    amount: formatMoney(item.target - item.have, item.currency, { compact: true }),
                  })}
            </span>
          </span>
          <span className={styles.meter}>
            <ProgressMeter
              value={Math.min(item.have, item.target)}
              max={item.target}
              label={t("balance.goal.label", { name: item.name })}
            />
          </span>
          <span className={styles.amounts}>
            {formatMoney(item.have, item.currency)} / {formatMoney(item.target, item.currency)}
            {item.deadline ? ` · ${t("balance.goal.by", { date: formatDate(item.deadline) })}` : ""}
          </span>
        </span>
      </>
    );
    const own = item.goal;
    return (
      <li key={item.key}>
        {own ? (
          <button type="button" onClick={() => onEdit(own)} className={styles.row}>
            {content}
          </button>
        ) : (
          <div className={styles.row}>{content}</div>
        )}
      </li>
    );
  };

  return (
    <Card
      title={t("balance.goals")}
      subtitle={t("balance.goals.subtitle", { reached, total: goals.length })}
      icon="target"
      action={<AddButton size="sm" onClick={onAdd} label={t("common.add")} />}
    >
      {closest.length > 0 && (
        <div>
          {goals.length > 1 && <p className={styles.title}>{t("balance.goals.closest")}</p>}
          <ul className={styles.rows}>{closest.map(row)}</ul>
        </div>
      )}
      {done.length > 0 && <ul className={styles.rows}>{done.map(row)}</ul>}
      {monthly}
    </Card>
  );
};

export default GoalsCard;
