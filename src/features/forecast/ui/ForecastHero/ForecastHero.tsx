"use client";

import type { Forecast } from "@/features/forecast/model/forecast";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatMonthCompact } from "@/shared/lib/date";
import { formatMoney, formatPercent } from "@/shared/lib/money";
import CountUp from "@/shared/ui/CountUp/CountUp";
import HeroSplit from "@/shared/ui/HeroSplit/HeroSplit";
import PageHero, { type HeroStat } from "@/shared/ui/PageHero/PageHero";

interface ForecastHeroProps {
  f: Forecast;
  years: number;
  returnPct: number;
  spreadPct: number;
  inflationOn: boolean;
}

// The forecast's headline: the money at the horizon, its range and its sources
const ForecastHero = ({ f, years, returnPct, spreadPct, inflationOn }: ForecastHeroProps) => {
  const { t, tp } = useI18n();
  const { view, split } = f;
  const diff = f.endTotal - f.nowTotal;
  const now = f.projection[0];
  const held = now ? now.savings + now.investments : 0;
  const investedShare = now && held > 0 ? (now.investments / held) * 100 : 0;
  // A short amount in the shown currency
  const money = (amount: number, sign = false) => formatMoney(amount, view, { compact: true, sign });
  const hasRange = money(f.endLow) !== money(f.endHigh);
  // How a scenario's end compares with the expected one
  const vsBase = (amount: number) =>
    money(amount) === money(f.endTotal)
      ? t("forecast.hero.sameAsBase")
      : t("forecast.hero.vsBase", { delta: money(amount - f.endTotal, true) });
  let freedom = "-";
  if (f.freedomMonth) freedom = formatMonthCompact(f.freedomMonth);
  else if (f.avgSpend > 0)
    freedom = t("forecast.freedom.after", { year: (f.projection.at(-1)?.month ?? "").slice(0, 4) });

  const stats: HeroStat[] = [
    {
      label: t("forecast.now"),
      icon: "wallet",
      href: "/accounts",
      value: money(f.nowTotal),
      hint: t("forecast.hero.invested", { pct: formatPercent(investedShare, 0) }),
    },
    {
      label: t("forecast.scenario.low"),
      icon: "shield",
      value: money(f.endLow),
      hint: `${vsBase(f.endLow)} · ${t("balance.perYear", { pct: formatPercent(returnPct - spreadPct) })}`,
    },
    {
      label: t("forecast.scenario.high"),
      icon: "trend",
      value: money(f.endHigh),
      tone: "income",
      hint: `${vsBase(f.endHigh)} · ${t("balance.perYear", { pct: formatPercent(returnPct + spreadPct) })}`,
    },
    {
      label: t("forecast.freedom"),
      icon: "target",
      value: freedom,
      hint:
        f.avgSpend > 0
          ? t("forecast.freedom.covers", { covered: formatPercent(f.coverNow, 0) })
          : t("forecast.freedom.noSpend"),
    },
  ];

  return (
    <PageHero
      icon="calendar"
      label={tp(inflationOn ? "forecast.inYearsReal" : "forecast.inYears", years)}
      value={<CountUp value={f.endTotal} format={(amount) => formatMoney(amount, view)} />}
      sub={hasRange ? t("forecast.range", { low: money(f.endLow), high: money(f.endHigh) }) : undefined}
      delta={
        f.nowTotal > 0
          ? {
              text: `${money(diff, true)} · ${tp("forecast.overYears", years, {
                pct: `${diff >= 0 ? "+" : ""}${formatPercent((diff / f.nowTotal) * 100)}`,
              })}`,
              good: diff >= 0,
            }
          : undefined
      }
      aside={
        <HeroSplit
          title={t("forecast.sources")}
          segments={[
            { id: "have", label: t("forecast.have"), value: split.start, colorSlot: 1 },
            { id: "add", label: t("forecast.add"), value: split.deposits, colorSlot: 2 },
            { id: "earns", label: t("forecast.earns"), value: split.growth, colorSlot: 3 },
          ]}
          currency={view}
          columns={3}
        />
      }
      stats={f.nowTotal !== 0 || f.endTotal !== 0 ? stats : undefined}
    />
  );
};

export default ForecastHero;
