"use client";

import { useStore } from "@/app/hooks";
import { savingsTrail } from "@/features/accounts/model/balanceTrail";
import { goalsSummary } from "@/features/accounts/model/goals";
import { accountColorSlot, accountKind } from "@/features/accounts/model/kinds";
import { accountsSummary } from "@/features/accounts/model/summary";
import { displayCurrencies } from "@/features/data/model/currencies";
import { gamification } from "@/features/profile/model/achievements";
import { useI18n } from "@/shared/i18n/useI18n";
import { addMonths, formatMonthShort, monthOf, todayISO } from "@/shared/lib/date";
import { convert, formatMoney, formatNumber, formatPercent } from "@/shared/lib/money";
import CountUp from "@/shared/ui/CountUp/CountUp";
import HeroSplit from "@/shared/ui/HeroSplit/HeroSplit";
import HeroTrend from "@/shared/ui/HeroTrend/HeroTrend";
import PageHero, { type HeroStat } from "@/shared/ui/PageHero/PageHero";

import styles from "./AccountsHero.module.scss";

// How many months back the trend of the accounts reaches
const TRAIL_MONTHS = 6;

// The accounts headline: the money in them, the cushion, the goals and the debts
const AccountsHero = () => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const { settings } = state;
  const base = settings.baseCurrency;
  const today = todayISO();
  const { worth, monthAgo, delta, byKind } = accountsSummary(state, today);
  const goals = goalsSummary(state, today);
  const { facts } = gamification(state);
  const trail = savingsTrail(state, today, TRAIL_MONTHS);
  const moved = trail.some((value) => Math.abs(value - (trail[0] ?? 0)) >= 0.5);
  const month = monthOf(today);
  const months = facts.emergencyMonths;
  const hasSpend = facts.avgExpenseUAH > 0;
  // A short amount in the base currency
  const money = (amount: number) => formatMoney(amount, base, { compact: true });
  let cushion = t("accounts.cushion.low");
  if (months >= 6) cushion = t("accounts.cushion.solid");
  else if (months >= 3) cushion = t("accounts.cushion.ok");
  let debtHint: string | undefined = t("accounts.debts.none");
  if (worth.debts > 0) {
    debtHint =
      worth.assets > 0
        ? t("accounts.debts.share", { pct: formatPercent((worth.debts / worth.assets) * 100, 0) })
        : undefined;
  }

  const stats: HeroStat[] = [
    {
      label: t("balance.netWorth"),
      icon: "wallet",
      value: money(worth.total),
      hint: t("accounts.withInvestments", { amount: money(worth.investments) }),
    },
    {
      label: t("health.part.cushion"),
      icon: "shield",
      value: hasSpend ? t("profile.health.months", { n: formatNumber(months, 1) }) : "-",
      delta: hasSpend ? { text: cushion, good: months >= 3 } : undefined,
      hint: hasSpend
        ? t("accounts.cushion.hint", { spend: money(convert(facts.avgExpenseUAH, "UAH", base, settings.rates)) })
        : t("accounts.cushion.noSpend"),
    },
  ];
  if (goals.goals.length > 0) {
    stats.push({
      label: t("balance.goals"),
      icon: "target",
      value: formatPercent((goals.haveTotal / goals.targetTotal) * 100, 0),
      hint: t("accounts.goals.hint", { have: money(goals.haveTotal), target: money(goals.targetTotal) }),
    });
  }
  stats.push({
    label: t("balance.debts"),
    icon: "debt",
    value: worth.debts > 0 ? `−${money(worth.debts)}` : formatMoney(0, base),
    tone: worth.debts > 0 ? "expense" : undefined,
    hint: debtHint,
  });

  return (
    <PageHero
      icon="bank"
      label={t("hero.inAccounts")}
      value={<CountUp value={worth.savings} format={(amount) => formatMoney(amount, base)} />}
      sub={
        worth.savings === 0
          ? undefined
          : displayCurrencies(state)
              .filter((currency) => currency !== base)
              .map((currency) =>
                formatMoney(convert(worth.savings, base, currency, settings.rates), currency, { exact: true }),
              )
              .join("  ·  ")
      }
      delta={
        monthAgo.savings !== 0 && Math.abs(delta) >= 0.5
          ? {
              text: t("accounts.inAMonth", { amount: formatMoney(delta, base, { compact: true, sign: true }) }),
              good: delta >= 0,
            }
          : undefined
      }
      note={tp("dash.accountsCount", state.savings.length)}
      aside={
        byKind.length > 0 || moved ? (
          <div className={styles.aside}>
            {moved && (
              <HeroTrend
                title={tp("common.lastMonths", TRAIL_MONTHS)}
                summary={formatMoney((trail.at(-1) ?? 0) - (trail[0] ?? 0), base, { compact: true, sign: true })}
                values={trail}
                tone="accent"
                height={72}
                from={formatMonthShort(addMonths(month, -TRAIL_MONTHS))}
                to={formatMonthShort(month)}
              />
            )}
            {byKind.length > 0 && (
              <HeroSplit
                title={t("accounts.byType")}
                segments={byKind.map(([kind, value]) => ({
                  id: kind,
                  label: t(`accountKind.${kind}`),
                  icon: accountKind(kind).icon,
                  value,
                  colorSlot: accountColorSlot(kind),
                }))}
                currency={base}
              />
            )}
          </div>
        ) : undefined
      }
      stats={state.savings.length > 0 || state.debts.length > 0 ? stats : undefined}
    />
  );
};

export default AccountsHero;
