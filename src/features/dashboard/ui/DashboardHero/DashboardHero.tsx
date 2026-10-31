"use client";

import { ACCOUNT_KINDS } from "@/features/accounts/model/kinds";
import { worthHistory } from "@/features/dashboard/model/history";
import { safeToSpend } from "@/features/dashboard/model/safeToSpend";
import { useMonthSummary } from "@/features/dashboard/model/useMonthSummary";
import { displayCurrencies } from "@/features/data/model/currencies";
import { netWorth, netWorthByKind } from "@/features/data/model/finmath";
import { INVESTMENT_KINDS } from "@/features/investments/model/kinds";
import { useI18n } from "@/shared/i18n/useI18n";
import { trendStart } from "@/shared/lib/chart";
import { addMonths, formatMonthShort } from "@/shared/lib/date";
import { convert, formatMoney, formatPercent } from "@/shared/lib/money";
import CountUp from "@/shared/ui/CountUp/CountUp";
import HeroSplit from "@/shared/ui/HeroSplit/HeroSplit";
import HeroTrend from "@/shared/ui/HeroTrend/HeroTrend";
import PageHero from "@/shared/ui/PageHero/PageHero";

import MonthTile from "./MonthTile";
import SafeTile from "./SafeTile";

import styles from "./DashboardHero.module.scss";

// A change with its sign, a minus sign for a fall
const signed = (value: number, text: string) => `${value >= 0 ? "+" : "−"}${text}`;

// The overview's headline: net worth, safe to spend today and the month so far
const DashboardHero = () => {
  const { state, base, month, today, soFar } = useMonthSummary();
  const { t, tp } = useI18n();
  const { settings } = state;
  const worth = netWorth(state, today);
  const history = worthHistory(state, today);
  const trend = history.slice(trendStart(history));
  const monthAgo = trend.at(-2) ?? worth.total;
  const monthDelta = worth.total - monthAgo;
  const monthPct = monthAgo > 0 ? (monthDelta / monthAgo) * 100 : 0;
  const trendDelta = worth.total - (trend[0] ?? worth.total);
  const trendMoves = trend.some((value) => value !== trend[0]);
  // A short amount in the base currency
  const money = (amount: number, sign = false) => formatMoney(amount, base, { compact: true, sign });

  // The name of a kind of account or position
  const kindLabel = (id: string) => {
    const [family, value] = id.split(":");
    const account = ACCOUNT_KINDS.find((kind) => kind.value === value);
    if (family === "acc" && account) return t(`accountKind.${account.value}`);
    const position = INVESTMENT_KINDS.find((kind) => kind.value === value);
    return position ? t(`investmentKind.${position.value}`) : id;
  };

  return (
    <PageHero
      icon="wallet"
      label={t("balance.netWorth")}
      value={<CountUp value={worth.total} format={(amount) => formatMoney(amount, base)} />}
      sub={displayCurrencies(state)
        .filter((currency) => currency !== base)
        .map((currency) => formatMoney(convert(worth.total, base, currency, settings.rates), currency, { exact: true }))
        .join("  ·  ")}
      delta={
        monthAgo !== 0 && monthDelta !== 0
          ? {
              text: `${money(monthDelta, true)} ${t("dash.inAMonth", { pct: signed(monthDelta, formatPercent(Math.abs(monthPct))) })}`,
              good: monthDelta >= 0,
            }
          : undefined
      }
      note={worth.debts > 0 ? t("hero.debtsIncluded", { amount: money(worth.debts) }) : undefined}
      aside={
        trendMoves ? (
          <HeroTrend
            title={tp("common.lastMonths", trend.length)}
            summary={<span className={trendDelta >= 0 ? styles.up : styles.down}>{money(trendDelta, true)}</span>}
            values={trend}
            tone={trendDelta >= 0 ? "income" : "expense"}
            from={formatMonthShort(addMonths(month, 1 - trend.length))}
            to={formatMonthShort(month)}
            height={176}
          />
        ) : (
          <HeroSplit
            title={t("hero.madeOf")}
            segments={netWorthByKind(state, today).map((row) => ({
              id: row.id,
              label: kindLabel(row.id),
              icon: row.icon,
              value: row.base,
              colorSlot: row.colorSlot,
            }))}
            currency={base}
          />
        )
      }
      side={
        <div className={styles.sides}>
          <SafeTile safe={safeToSpend(state, today)} base={base} />
          <MonthTile current={soFar} base={base} />
        </div>
      }
    />
  );
};

export default DashboardHero;
