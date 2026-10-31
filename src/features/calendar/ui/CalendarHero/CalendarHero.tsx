"use client";

import { useStore } from "@/app/hooks";
import { monthFigures, runningNet, type DaySummary } from "@/features/calendar/model/monthEvents";
import type { TaxObligation } from "@/features/income/model/taxCalendar";
import MonthSwitcher from "@/features/transactions/ui/MonthSwitcher/MonthSwitcher";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatDateShort, todayISO } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import CountUp from "@/shared/ui/CountUp/CountUp";
import HeroTrend from "@/shared/ui/HeroTrend/HeroTrend";
import PageHero, { type HeroStat } from "@/shared/ui/PageHero/PageHero";

interface CalendarHeroProps {
  month: string;
  chosen: string;
  days: DaySummary[];
  obligations: TaxObligation[];
  onMonth: (month: string) => void;
}

// Most figures under the headline
const MAX_STATS = 4;

// The month's net and build-up, money to move, taxes, busiest and no-spend days
const CalendarHero = ({ month, chosen, days, obligations, onMonth }: CalendarHeroProps) => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const base = state.settings.baseCurrency;
  const figures = monthFigures(days, todayISO());
  const unpaid = obligations.filter((obligation) => !state.settings.taxPaid?.[obligation.id]);
  const taxDue = unpaid.reduce((sum, obligation) => sum + (obligation.amount ?? 0), 0);
  // A short amount in the base currency
  const money = (amount: number) => formatMoney(amount, base, { compact: true });
  const totals = runningNet(days);
  const lowest = Math.min(...totals);
  const lowDay = days[totals.indexOf(lowest) - 1];

  const stats: HeroStat[] = [];
  if (figures.aheadOut > 0 || figures.aheadIn > 0) {
    if (figures.aheadOut > 0) {
      stats.push({
        label: t("calendar.stillOut"),
        icon: "spend",
        href: "/transactions",
        value: money(figures.aheadOut),
        tone: "expense",
        hint: tp("calendar.days", figures.daysOut),
      });
    }
    if (figures.aheadIn > 0) {
      stats.push({
        label: t("calendar.stillIn"),
        icon: "arrowDown",
        href: "/income",
        value: money(figures.aheadIn),
        tone: "income",
        hint: tp("calendar.days", figures.daysIn),
      });
    }
  } else {
    if (figures.spent > 0) {
      stats.push({
        label: t("tx.stat.expenses"),
        icon: "spend",
        href: "/transactions",
        value: money(figures.spent),
        tone: "expense",
      });
    }
    if (figures.earned > 0) {
      stats.push({
        label: t("tx.stat.income"),
        icon: "arrowDown",
        href: "/income",
        value: money(figures.earned),
        tone: "income",
      });
    }
  }
  if (unpaid.length > 0) {
    const deadlines = tp("calendar.deadlines", unpaid.length);
    stats.push({
      label: t("calendar.taxes"),
      icon: "receipt",
      href: "/income",
      value: taxDue > 0.5 ? formatMoney(taxDue, "UAH", { compact: true }) : deadlines,
      hint: taxDue > 0.5 ? deadlines : undefined,
    });
  }
  if (figures.busiest) {
    const top = figures.busiest.events
      .filter((event) => event.kind === "expense")
      .toSorted((a, b) => (b.amount ?? 0) - (a.amount ?? 0))[0];
    stats.push({
      label: t("calendar.busiest"),
      icon: "flame",
      value: formatDateShort(figures.busiest.date),
      hint: top ? `${money(figures.busiest.spent)} · ${top.title}` : money(figures.busiest.spent),
    });
  }
  if (figures.busiest && figures.daysGone > 0) {
    stats.push({
      label: t("calendar.noSpend"),
      icon: "sparkle",
      value: String(figures.daysWithoutSpend),
      hint: tp("calendar.noSpend.hint", figures.daysGone),
    });
  }

  return (
    <PageHero
      icon="calendar"
      label={t("tx.stat.net")}
      action={<MonthSwitcher month={chosen} onChange={onMonth} />}
      value={<CountUp value={figures.net} format={(amount) => formatMoney(amount, base, { sign: true })} />}
      sub={t("calendar.net")}
      note={tp("common.entries", figures.entries)}
      aside={
        totals.some((total) => total !== 0) ? (
          <HeroTrend
            title={t("calendar.running")}
            summary={
              lowest < 0 && lowDay
                ? t("calendar.lowest", { amount: money(lowest), date: formatDateShort(lowDay.date) })
                : undefined
            }
            values={totals}
            tone={figures.net < 0 ? "expense" : "income"}
            from={formatDateShort(days[0]?.date ?? month)}
            to={formatDateShort(days.at(-1)?.date ?? month)}
          />
        ) : undefined
      }
      stats={stats.slice(0, MAX_STATS)}
    />
  );
};

export default CalendarHero;
