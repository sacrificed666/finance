"use client";

import type { ReactNode } from "react";

import { useStore } from "@/app/hooks";
import { keptRate, periodDays, type Report } from "@/features/reports/model/report";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatMonthShort, todayISO } from "@/shared/lib/date";
import { formatMoney, formatNumber, formatPercent } from "@/shared/lib/money";
import CountUp from "@/shared/ui/CountUp/CountUp";
import HeroTrend from "@/shared/ui/HeroTrend/HeroTrend";
import PageHero, { type HeroStat } from "@/shared/ui/PageHero/PageHero";

interface ReportsHeroProps {
  r: Report;
  previous: string;
  action?: ReactNode;
}

// A change in percentage points with its sign
const signed = (value: number) => `${value >= 0 ? "+" : "−"}${formatNumber(Math.abs(value), 1)}`;

// The period's net beside its year, money in and out, rate and pace
const ReportsHero = ({ r, previous: previousName, action }: ReportsHeroProps) => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const base = state.settings.baseCurrency;
  const { current, previous } = r;
  const rate = keptRate(current.income, current.net);
  const before = keptRate(previous.income, previous.net);
  const { days, elapsed } = periodDays(current.months, todayISO());
  // A short amount in the base currency
  const money = (amount: number, sign = false) => formatMoney(amount, base, { compact: true, sign });
  const firstActive = r.year.findIndex((entry) => entry.income > 0 || entry.expense > 0);
  const months = firstActive === -1 ? [] : r.year.slice(firstActive);
  const nets = months.map((entry) => entry.income - entry.expense);
  const average = nets.reduce((sum, value) => sum + value, 0) / Math.max(1, nets.length);
  // How a figure compares with the period it is set against
  const vsPrev = (now: number, then: number, lowerIsBetter = false) =>
    then !== 0 || now !== 0
      ? {
          text: t(r.compare === "lastYear" ? "reports.vsYearAgo" : "reports.vsPrev", {
            delta: money(now - then, true),
          }),
          good: lowerIsBetter ? now <= then : now >= then,
        }
      : undefined;

  const stats: HeroStat[] = [
    {
      label: t("tx.stat.income"),
      icon: "arrowDown",
      href: "/income",
      value: money(current.income),
      tone: "income",
      delta: vsPrev(current.income, previous.income),
    },
    {
      label: t("tx.stat.expenses"),
      icon: "spend",
      href: "/transactions",
      value: money(current.expense),
      tone: "expense",
      delta: vsPrev(current.expense, previous.expense, true),
    },
    {
      label: t("dash.savingsRate"),
      icon: "percent",
      value: current.income > 0 ? formatPercent(rate) : "-",
      delta:
        current.income > 0 && previous.income > 0
          ? { text: t("reports.pp", { delta: signed(rate - before) }), good: rate >= before }
          : undefined,
    },
    {
      label: t("tx.stat.daily"),
      icon: "calendar",
      value: elapsed > 0 ? money(current.expense / elapsed) : "-",
      hint: tp("calendar.days", r.inProgress ? elapsed : days),
    },
  ];

  return (
    <PageHero
      icon="chart"
      label={t("tx.stat.net")}
      action={action}
      value={<CountUp value={current.net} format={(amount) => formatMoney(amount, base, { sign: true })} />}
      sub={current.income > 0 ? t("reports.kept", { pct: formatPercent(rate, 0) }) : undefined}
      delta={vsPrev(current.net, previous.net)}
      note={t(r.inProgress ? "reports.againstToDate" : "reports.against", { period: previousName })}
      aside={
        months.length > 1 ? (
          <HeroTrend
            fromZero
            title={tp("common.lastMonths", months.length)}
            summary={t("income.perMonthAvg", { amount: money(average, true) })}
            values={nets}
            tone={average < 0 ? "expense" : "income"}
            from={formatMonthShort(months[0]?.month ?? r.start)}
            to={formatMonthShort(months.at(-1)?.month ?? r.end)}
          />
        ) : undefined
      }
      stats={current.income > 0 || current.expense > 0 ? stats : undefined}
    />
  );
};

export default ReportsHero;
