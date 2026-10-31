"use client";

import { useStore } from "@/app/hooks";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import { incomeStability, incomeSummary, regularIncomes } from "@/features/income/model/income";
import { useI18n } from "@/shared/i18n/useI18n";
import { flowStart } from "@/shared/lib/chart";
import { daysBetween, formatDateShort, formatMonthShort, formatMonthText, todayISO } from "@/shared/lib/date";
import { convert, formatMoney, formatPercent } from "@/shared/lib/money";
import CountUp from "@/shared/ui/CountUp/CountUp";
import HeroTrend from "@/shared/ui/HeroTrend/HeroTrend";
import PageHero, { type HeroStat } from "@/shared/ui/PageHero/PageHero";

// Most figures under the headline; the rest wait for a free tile
const MAX_STATS = 4;

// How far months may stray from their average and still read as steady
const STEADY_SHARE = 0.2;

// The income headline: this month, the average, the year, tax and what comes next
const IncomeHero = () => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const category = useCategoryName();
  const base = state.settings.baseCurrency;
  const today = todayISO();
  const summary = incomeSummary(state, today);
  const stability = incomeStability(summary.series, summary.month);
  const regular = regularIncomes(state, today)[0];
  const { tax, year } = summary;
  const series = summary.series.slice(flowStart(summary.series.map((entry) => entry.income)));
  // A short amount in the base currency
  const money = (amount: number, sign = false) => formatMoney(amount, base, { compact: true, sign });
  const taxHint =
    tax.entries > 0
      ? [
          t("income.taxHint", {
            pct: formatPercent((tax.tax / Math.max(1, tax.gross - tax.vat)) * 100),
            gross: money(tax.gross),
          }),
          tp("income.taxedEntries", tax.entries),
          tax.vat > 0 ? t("income.vatHint", { vat: money(tax.vat) }) : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : t("income.noTaxYet");

  const stats: HeroStat[] = [
    {
      label: t("income.average6"),
      icon: "chart",
      value: money(summary.average),
      hint: summary.recentMonths > 0 ? tp("income.fullMonths", summary.recentMonths) : undefined,
    },
    {
      label: t("income.ytd", { year }),
      icon: "calendar",
      value: money(summary.yearToDate),
      hint: summary.yearToDate > 0 ? tp("income.ytdHint", summary.monthsSoFar) : undefined,
    },
  ];
  // The year's tax once there is a regime or a taxed entry to count it from
  if (tax.entries > 0 || state.settings.tax.regime !== "none") {
    stats.push({
      label: t("income.taxYear", { year }),
      icon: "receipt",
      value: money(tax.entries > 0 ? tax.tax : 0),
      tone: tax.entries > 0 ? "expense" : undefined,
      hint: taxHint,
    });
  }
  // What is still to come, once something is planned
  if (summary.planned > 0) {
    stats.push({
      label: t("income.plannedAhead"),
      icon: "repeat",
      value: money(summary.plannedTotal),
      hint: tp("common.entries", summary.planned),
    });
  }
  // When the soonest regular income should come again
  if (regular) {
    const days = daysBetween(today, regular.next);
    stats.push({
      label: t("income.nextPay"),
      icon: "banknote",
      value: formatDateShort(regular.next),
      delta: { text: days > 0 ? tp("taxcal.inDays", days) : t("income.nextPay.today"), good: true },
      hint: t("income.nextPay.hint", {
        name: regular.name || category(state.categories.find((entry) => entry.id === regular.categoryId)),
        amount: money(convert(regular.amount, regular.currency, base, state.settings.rates)),
      }),
    });
  }
  // How evenly the last full months brought money in
  if (stability) {
    stats.push({
      label: t("income.stability"),
      icon: "trend",
      value: `±${formatPercent(stability.share * 100, 0)}`,
      delta: {
        text: stability.share <= STEADY_SHARE ? t("income.stability.steady") : t("income.stability.uneven"),
        good: stability.share <= STEADY_SHARE,
      },
      hint: tp("income.stability.hint", stability.months, { amount: money(stability.spread) }),
    });
  }

  return (
    <PageHero
      icon="arrowDown"
      label={t("income.thisMonth")}
      value={<CountUp value={summary.thisMonth} format={(amount) => formatMoney(amount, base)} />}
      sub={
        summary.plannedThisMonth > 0
          ? t("tx.soFarPlanned", {
              soFar: money(summary.thisMonth - summary.plannedThisMonth),
              planned: money(summary.plannedThisMonth),
            })
          : undefined
      }
      delta={
        summary.recentMonths > 0
          ? {
              text:
                Math.abs(summary.soFar - summary.averageToDate) < 0.5
                  ? t("income.atAverageToDate")
                  : t("income.vsAverageToDate", { delta: money(summary.soFar - summary.averageToDate, true) }),
              good: summary.soFar >= summary.averageToDate,
            }
          : undefined
      }
      aside={
        summary.recentMonths > 1 ? (
          <HeroTrend
            fromZero
            title={tp("common.lastMonths", series.length)}
            summary={
              summary.best
                ? t("income.best", { amount: money(summary.best.income), month: formatMonthText(summary.best.month) })
                : undefined
            }
            values={series.map((entry) => entry.income)}
            tone="income"
            from={formatMonthShort(series[0]?.month ?? summary.month)}
            to={formatMonthShort(summary.month)}
          />
        ) : undefined
      }
      stats={
        summary.yearToDate > 0 || summary.average > 0 || summary.planned > 0 ? stats.slice(0, MAX_STATS) : undefined
      }
    />
  );
};

export default IncomeHero;
