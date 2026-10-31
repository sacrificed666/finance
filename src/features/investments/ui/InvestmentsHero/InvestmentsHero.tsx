"use client";

import { useStore } from "@/app/hooks";
import { displayCurrencies } from "@/features/data/model/currencies";
import { investmentTotals } from "@/features/investments/model/positions";
import { useI18n } from "@/shared/i18n/useI18n";
import { addMonths, formatMonthShort, formatMonthText, monthOf, todayISO } from "@/shared/lib/date";
import { convert, formatMoney, formatPercent } from "@/shared/lib/money";
import CountUp from "@/shared/ui/CountUp/CountUp";
import HeroTrend from "@/shared/ui/HeroTrend/HeroTrend";
import PageHero, { type HeroStat } from "@/shared/ui/PageHero/PageHero";

// The investments headline: value, money in, earnings and the year ahead
const InvestmentsHero = () => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const { settings } = state;
  const base = settings.baseCurrency;
  const today = todayISO();
  const totals = investmentTotals(state, today);
  // A short amount in the base currency
  const money = (amount: number, sign = false) => formatMoney(amount, base, { compact: true, sign });
  let earnedTone: HeroStat["tone"];
  if (totals.earned > 0) earnedTone = "income";
  else if (totals.earned < 0) earnedTone = "expense";
  let earnedHint: string | undefined;
  if (totals.earned > 0) {
    earnedHint =
      totals.paidOut > 0.5
        ? t("investments.hero.paidOut", { amount: money(totals.paidOut) })
        : t("investments.hero.atWork");
  }
  const projected = totals.nextYear !== 0;
  const first = state.investments.reduce<string | null>(
    (min, inv) => (!min || inv.startDate < min ? inv.startDate : min),
    null,
  );
  const since = first ? t("investments.hero.since", { month: formatMonthText(monthOf(first)) }) : undefined;

  const stats: HeroStat[] = [
    {
      label: t("balance.inv.invested"),
      icon: "arrowDown",
      value: money(totals.invested),
      hint: totals.topUps > 0 ? t("investments.hero.topUps", { amount: money(totals.topUps) }) : since,
    },
    {
      label: t("balance.inv.earned"),
      icon: "trend",
      value: money(totals.earned, true),
      tone: earnedTone,
      hint: earnedHint,
    },
    {
      label: t("investments.earnsYear"),
      icon: "calendar",
      value: projected ? money(totals.nextYear, true) : "-",
      tone: totals.nextYear > 0 ? "income" : undefined,
      delta:
        totals.capital > 0 && projected
          ? {
              text: t("balance.perYear", { pct: formatPercent((totals.nextYear / totals.capital) * 100) }),
              good: totals.nextYear >= 0,
            }
          : undefined,
      hint: projected
        ? t("investments.nextYear.hint", { amount: money(totals.nextYear / 12) })
        : t("balance.inv.marketNotProjected"),
    },
  ];
  return (
    <PageHero
      icon="banknote"
      label={t("balance.inv.currentValue")}
      value={<CountUp value={totals.value} format={(amount) => formatMoney(amount, base)} />}
      sub={displayCurrencies(state)
        .filter((currency) => currency !== base)
        .map((currency) =>
          formatMoney(convert(totals.value, base, currency, settings.rates), currency, { exact: true }),
        )
        .join("  ·  ")}
      delta={
        totals.invested > 0
          ? {
              text: t("balance.inv.onPrincipal", { pct: formatPercent((totals.value / totals.invested - 1) * 100) }),
              good: totals.value >= totals.invested,
            }
          : undefined
      }
      note={tp("balance.inv.positions", state.investments.length)}
      aside={
        <HeroTrend
          title={t("investments.nextYear")}
          summary={t(totals.topUps > 0 ? "investments.hero.inYearTopUps" : "investments.hero.inYear", {
            amount: money(totals.ahead[12] ?? 0),
          })}
          values={totals.ahead}
          tone="income"
          from={t("forecast.now")}
          to={formatMonthShort(addMonths(monthOf(today), 12))}
        />
      }
      stats={stats}
    />
  );
};

export default InvestmentsHero;
