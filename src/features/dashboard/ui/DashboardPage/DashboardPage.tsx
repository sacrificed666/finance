"use client";

import { useState, type ComponentType } from "react";

import { useStore } from "@/app/hooks";
import { greetingKey, useFirstName } from "@/features/dashboard/model/greeting";
import { dashboardLayout, normalizeDashboard } from "@/features/dashboard/model/layout";
import { startSteps } from "@/features/dashboard/model/start";
import { hasAnyData } from "@/features/dashboard/model/summary";
import CashAheadCard from "@/features/dashboard/ui/CashAheadCard/CashAheadCard";
import CashFlowCard from "@/features/dashboard/ui/CashFlowCard/CashFlowCard";
import ComingUpCard from "@/features/dashboard/ui/ComingUpCard/ComingUpCard";
import DashboardHero from "@/features/dashboard/ui/DashboardHero/DashboardHero";
import HoldingsCard from "@/features/dashboard/ui/HoldingsCard/HoldingsCard";
import InsightsRow from "@/features/dashboard/ui/InsightsRow/InsightsRow";
import LayoutSheet from "@/features/dashboard/ui/LayoutSheet/LayoutSheet";
import ProgressCard from "@/features/dashboard/ui/ProgressCard/ProgressCard";
import QuickAddCard from "@/features/dashboard/ui/QuickAddCard/QuickAddCard";
import RecentCard from "@/features/dashboard/ui/RecentCard/RecentCard";
import SpendingCard from "@/features/dashboard/ui/SpendingCard/SpendingCard";
import StartCard from "@/features/dashboard/ui/StartCard/StartCard";
import SubscriptionsCard from "@/features/dashboard/ui/SubscriptionsCard/SubscriptionsCard";
import { displayCurrencies } from "@/features/data/model/currencies";
import type { DashboardCardId } from "@/features/data/model/types";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { currentHour, formatDay, todayISO } from "@/shared/lib/date";
import { currencyOptions, type Currency } from "@/shared/lib/money";
import Icon from "@/shared/ui/Icon/Icon";
import PageBody from "@/shared/ui/PageBody/PageBody";
import PageHeader from "@/shared/ui/PageHeader/PageHeader";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";
import Split from "@/shared/ui/Split/Split";

import styles from "./DashboardPage.module.scss";

// The component behind each card of the overview
const CARDS: Record<DashboardCardId, ComponentType> = {
  start: StartCard,
  quickAdd: QuickAddCard,
  cashFlow: CashFlowCard,
  spending: SpendingCard,
  cashAhead: CashAheadCard,
  comingUp: ComingUpCard,
  recent: RecentCard,
  holdings: HoldingsCard,
  subscriptions: SubscriptionsCard,
  progress: ProgressCard,
};

// The overview: a greeting, net worth, this month and the chosen cards
const DashboardPage = () => {
  const { state, update } = useStore();
  const { t } = useI18n();
  const name = useFirstName();
  const greeting = t(greetingKey(currentHour()));
  const [arranging, setArranging] = useState(false);
  const currencies = displayCurrencies(state);
  const layout = dashboardLayout(state.settings.dashboard);
  const anyData = hasAnyData(state);
  const started = startSteps(state).every((step) => step.done);
  // The cards of a column that are not hidden
  const shown = (ids: DashboardCardId[]) =>
    ids
      .filter((id) => !layout.hidden.includes(id))
      .map((id) => {
        const Shown = CARDS[id];
        return <Shown key={id} />;
      });
  const main = shown(layout.main);
  const side = shown(layout.side);

  return (
    <>
      <PageHeader
        title={name ? `${greeting}, ${name}` : greeting}
        subtitle={formatDay(todayISO())}
        action={
          <div className={styles.actions}>
            <SegmentedControl<Currency>
              label={t("settings.baseCurrency")}
              options={currencyOptions(currencies)}
              fit
              value={state.settings.baseCurrency}
              onChange={(baseCurrency) => update((s) => ({ ...s, settings: { ...s.settings, baseCurrency } }))}
            />
            {anyData && (
              <button
                type="button"
                aria-label={t("dash.layout.title")}
                title={t("dash.layout.title")}
                onClick={() => setArranging(true)}
                className={styles.arrange}
              >
                <Icon name="sliders" size={16} />
              </button>
            )}
          </div>
        }
      />

      {anyData ? (
        <PageBody>
          <DashboardHero />
          <InsightsRow />
          {main.length > 0 && side.length > 0 ? (
            <Split main={main} side={side} />
          ) : (
            <div className={cx(styles.single, main.length === 0 && styles.spread)}>{main.length > 0 ? main : side}</div>
          )}
        </PageBody>
      ) : (
        <StartCard alone />
      )}
      {arranging && (
        <LayoutSheet
          layout={layout}
          retired={started ? ["start"] : undefined}
          onChange={(next) =>
            update((s) => ({ ...s, settings: { ...s.settings, dashboard: normalizeDashboard(next) } }))
          }
          onClose={() => setArranging(false)}
        />
      )}
    </>
  );
};

export default DashboardPage;
