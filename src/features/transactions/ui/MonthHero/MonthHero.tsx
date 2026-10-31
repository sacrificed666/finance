"use client";

import { useStore } from "@/app/hooks";
import { monthlyBudgets } from "@/features/transactions/model/budgets";
import { monthSummary } from "@/features/transactions/model/monthSummary";
import { spendingPace } from "@/features/transactions/model/pace";
import MonthSwitcher from "@/features/transactions/ui/MonthSwitcher/MonthSwitcher";
import { useI18n } from "@/shared/i18n/useI18n";
import { flowStart } from "@/shared/lib/chart";
import { addMonths, daysInMonth, formatMonthNameText, formatMonthShort, todayISO } from "@/shared/lib/date";
import { formatMoney, formatPercent } from "@/shared/lib/money";
import CountUp from "@/shared/ui/CountUp/CountUp";
import HeroHeading from "@/shared/ui/HeroHeading/HeroHeading";
import HeroTrend from "@/shared/ui/HeroTrend/HeroTrend";
import PaceLines from "@/shared/ui/PaceLines/PaceLines";
import PageHero, { type HeroStat } from "@/shared/ui/PageHero/PageHero";

interface MonthHeroProps {
  month: string;
  switcherMonth?: string;
  onMonthChange: (month: string) => void;
}

// The expenses headline: spending and its pace, income, net, per day, budgets
const MonthHero = ({ month, switcherMonth = month, onMonthChange }: MonthHeroProps) => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const base = state.settings.baseCurrency;
  const summary = monthSummary(state, month, todayISO());
  const { totals, soFar, previousSoFar, budget } = summary;
  const year = summary.year.slice(flowStart(summary.year.map((entry) => entry.expense)));
  const pace = spendingPace(state, month, todayISO());
  const previousMonth = addMonths(month, -1);
  const paced = pace.soFar > 0 || pace.previous.some((value) => value > 0);
  // A short amount in the base currency
  const money = (amount: number, sign = false) => formatMoney(amount, base, { compact: true, sign });

  // The change against the month before, up to the same day while this one runs
  const vsLast = (now: number, before: number, lowerIsBetter = false) => {
    const delta = money(now - before, true);
    const lastName = formatMonthNameText(previousMonth);
    const same = Math.abs(now - before) < 0.5;
    let text = summary.isCurrent ? t("tx.pace.vs", { delta, month: lastName }) : t("tx.vsLastMonth", { delta });
    if (same) text = summary.isCurrent ? t("tx.pace.same", { month: lastName }) : t("tx.sameAsLastMonth");
    return summary.hasPrevious ? { text, good: lowerIsBetter ? now <= before : now >= before } : undefined;
  };
  // What came in so far and what is still planned, when part of the total lies ahead
  const stillAhead = (total: number, ahead: number) =>
    ahead > 0 ? t("tx.soFarPlanned", { soFar: money(total - ahead), planned: money(ahead) }) : undefined;

  const stats: HeroStat[] = [
    {
      label: t("tx.stat.income"),
      icon: "arrowDown",
      href: "/income",
      value: money(totals.income),
      tone: "income",
      delta: vsLast(soFar.income, previousSoFar.income),
      hint: stillAhead(totals.income, summary.plannedIncome),
    },
    {
      label: t("tx.stat.net"),
      icon: "exchange",
      value: formatMoney(totals.net, base, { sign: true, compact: true }),
      tone: totals.net < 0 ? "expense" : "income",
      delta: vsLast(soFar.net, previousSoFar.net),
      hint:
        totals.income > 0 && totals.net > 0
          ? t("tx.stat.kept", { pct: formatPercent((totals.net / totals.income) * 100, 0) })
          : undefined,
    },
    {
      label: t("tx.stat.daily"),
      icon: "calendar",
      value: money(summary.perDay),
      delta: summary.previousPerDay > 0 ? vsLast(summary.perDay, summary.previousPerDay, true) : undefined,
      hint:
        summary.isCurrent && summary.spentSoFar > 0
          ? t("tx.stat.pace", { amount: money(summary.projected) })
          : undefined,
    },
  ];
  if (monthlyBudgets(state).length > 0) {
    const left = budget.limit - budget.spent;
    stats.push({
      label: t("tx.stat.budgetLeft"),
      icon: "target",
      value: `${left < 0 ? "−" : ""}${money(Math.abs(left))}`,
      tone: left < 0 ? "expense" : undefined,
      delta: budget.over > 0 ? { text: tp("dash.budgets.overCount", budget.over), good: false } : undefined,
      hint: t("tx.budgets.of", { spent: money(budget.spent), limit: money(budget.limit) }),
    });
  }

  return (
    <PageHero
      icon="spend"
      label={t("hero.spent")}
      action={<MonthSwitcher month={switcherMonth} onChange={onMonthChange} />}
      value={<CountUp value={totals.expense} format={(amount) => formatMoney(amount, base)} />}
      sub={
        stillAhead(totals.expense, summary.plannedExpense) ??
        (totals.income > 0
          ? t("tx.stat.ofIncome", { pct: formatPercent((totals.expense / totals.income) * 100, 0) })
          : undefined)
      }
      delta={vsLast(soFar.expense, previousSoFar.expense, true)}
      note={tp("common.entries", summary.expenseCount)}
      aside={
        paced ? (
          <div>
            <HeroHeading title={t("tx.pace")} />
            <PaceLines
              current={pace.current}
              previous={pace.previous}
              days={Math.max(daysInMonth(month), pace.previous.length)}
              currency={base}
              currentLabel={formatMonthShort(month)}
              previousLabel={formatMonthShort(previousMonth)}
              caption={t("tx.pace.caption")}
              dayLabel={(day) => t("tx.pace.day", { day })}
              height={200}
            />
          </div>
        ) : summary.spendingMonths > 1 ? (
          <HeroTrend
            fromZero
            title={tp("common.lastMonths", year.length)}
            summary={t("income.perMonthAvg", { amount: money(summary.averageSpend) })}
            values={year.map((entry) => entry.expense)}
            tone="expense"
            from={formatMonthShort(year[0]?.month ?? month)}
            to={formatMonthShort(month)}
          />
        ) : undefined
      }
      stats={totals.expense > 0 || totals.income > 0 || state.budgets.length > 0 ? stats : undefined}
    />
  );
};

export default MonthHero;
