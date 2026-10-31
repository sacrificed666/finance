"use client";

import { useStore } from "@/app/hooks";
import { entryActivity } from "@/features/settings/model/activity";
import { useI18n } from "@/shared/i18n/useI18n";
import { currentMonth, formatMonthShort, formatMonthText, monthOf, todayISO } from "@/shared/lib/date";
import { formatNumber } from "@/shared/lib/money";
import HeroTrend from "@/shared/ui/HeroTrend/HeroTrend";
import PageHero, { type HeroStat } from "@/shared/ui/PageHero/PageHero";

// The data at a glance: entries since when, how often they come and what is kept
const SettingsHero = () => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const month = currentMonth();
  const today = todayISO();
  const recorded = state.transactions.filter((tx) => tx.date <= today);
  const activity = entryActivity(recorded, month);
  const expenseCategories = state.categories.filter((entry) => entry.kind === "expense").length;

  const stats: HeroStat[] = [
    { label: t("settings.about.accounts"), icon: "bank", href: "/accounts", value: String(state.savings.length) },
    {
      label: t("settings.about.investments"),
      icon: "bars",
      href: "/investments",
      value: String(state.investments.length),
    },
    {
      label: t("settings.categories.title"),
      icon: "tag",
      value: String(state.categories.length),
      hint: `${t("tx.type.expense")} ${String(expenseCategories)} · ${t("tx.type.income")} ${String(state.categories.length - expenseCategories)}`,
    },
    {
      label: t("tx.subs"),
      icon: "device",
      href: "/transactions",
      value: String(state.subscriptions.length),
      hint: tp("settings.categories.rules", state.recurring.length),
    },
  ];

  return (
    <PageHero
      icon="database"
      label={t("settings.hero")}
      value={tp("common.entries", recorded.length)}
      sub={activity.first ? t("settings.hero.since", { month: formatMonthText(monthOf(activity.first)) }) : undefined}
      note={t("settings.hero.note")}
      aside={
        activity.first ? (
          <HeroTrend
            fromZero
            title={t("settings.hero.activity")}
            summary={`≈ ${formatNumber(activity.average, activity.average < 10 ? 1 : 0)}`}
            values={activity.values}
            tone="accent"
            from={formatMonthShort(activity.from)}
            to={formatMonthShort(month)}
          />
        ) : undefined
      }
      stats={stats}
    />
  );
};

export default SettingsHero;
