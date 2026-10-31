"use client";

import { useDeferredValue, useState } from "react";

import { useStore } from "@/app/hooks";
import { displayCurrencies } from "@/features/data/model/currencies";
import type { PlannedEvent } from "@/features/data/model/types";
import { forecast, type ForecastControls } from "@/features/forecast/model/forecast";
import { useLegacyEvents } from "@/features/forecast/model/useLegacyEvents";
import { wishEvents } from "@/features/forecast/model/wishlist";
import AssumptionsCard from "@/features/forecast/ui/AssumptionsCard/AssumptionsCard";
import EventsCard from "@/features/forecast/ui/EventsCard/EventsCard";
import ForecastHero from "@/features/forecast/ui/ForecastHero/ForecastHero";
import GoalCard from "@/features/forecast/ui/GoalCard/GoalCard";
import ProjectionCard from "@/features/forecast/ui/ProjectionCard/ProjectionCard";
import WishlistCard from "@/features/forecast/ui/WishlistCard/WishlistCard";
import YearlyTableCard from "@/features/forecast/ui/YearlyTableCard/YearlyTableCard";
import { useI18n } from "@/shared/i18n/useI18n";
import { todayISO } from "@/shared/lib/date";
import { currencyOptions, type Currency } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";
import EmptyState from "@/shared/ui/EmptyState/EmptyState";
import Icon from "@/shared/ui/Icon/Icon";
import LinkButton from "@/shared/ui/LinkButton/LinkButton";
import PageBody from "@/shared/ui/PageBody/PageBody";
import PageHeader from "@/shared/ui/PageHeader/PageHeader";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";
import Split from "@/shared/ui/Split/Split";

import styles from "./ForecastPage.module.scss";

// The forecast page: the money ahead under the chosen assumptions
const ForecastPage = () => {
  const { state, update } = useStore();
  const { t } = useI18n();
  const currencies = displayCurrencies(state);
  const [view, setView] = useState<Currency>(state.settings.baseCurrency);
  const [controls, setControls] = useState<ForecastControls>(() => ({
    years: 10,
    returnPct: 0,
    spreadPct: 3,
    inflationOn: false,
    withDebts: state.debts.length > 0,
    withSaving: true,
  }));
  const shown = useDeferredValue(controls);
  useLegacyEvents();
  const events = state.plannedEvents;
  const f = forecast(state, todayISO(), { ...shown, view, events: [...events, ...wishEvents(state.wishlist)] });
  const isEmpty = state.savings.length === 0 && state.investments.length === 0;
  // Changes some of the assumptions
  const change = (fields: Partial<ForecastControls>) => setControls((current) => ({ ...current, ...fields }));
  // Keeps the planned events with the data, with an undo when asked
  const setEvents = (next: PlannedEvent[], undoLabel?: string) =>
    update((s) => ({ ...s, plannedEvents: next }), undoLabel);
  const assumptions = <AssumptionsCard f={f} controls={controls} onChange={change} />;

  return (
    <>
      <PageHeader
        title={t("forecast.title")}
        action={
          <SegmentedControl<Currency>
            label={t("forecast.viewCurrency")}
            options={currencyOptions(currencies)}
            fit
            value={view}
            onChange={setView}
          />
        }
      />

      <PageBody>
        <ForecastHero
          f={f}
          years={shown.years}
          returnPct={shown.returnPct}
          spreadPct={shown.spreadPct}
          inflationOn={shown.inflationOn}
        />

        {isEmpty ? (
          <>
            {assumptions}
            <Card>
              <EmptyState
                icon={<Icon name="trend" />}
                title={t("forecast.empty")}
                hint={t("forecast.empty.hint")}
                action={
                  <div className={styles.starts}>
                    <LinkButton href="/accounts">{t("forecast.goBalance")}</LinkButton>
                    <LinkButton href="/income" variant="ghost">
                      {t("dash.empty.income")}
                    </LinkButton>
                  </div>
                }
              />
            </Card>
          </>
        ) : (
          <>
            <Split
              main={
                <>
                  {assumptions}
                  <ProjectionCard
                    f={f}
                    years={shown.years}
                    returnPct={shown.returnPct}
                    inflationOn={shown.inflationOn}
                    withDebts={shown.withDebts}
                  />
                </>
              }
              side={
                <>
                  <GoalCard f={f} years={shown.years} returnPct={shown.returnPct} />
                  <EventsCard f={f} events={events} onChange={setEvents} />
                  <WishlistCard />
                </>
              }
            />
            <YearlyTableCard f={f} withDebts={shown.withDebts} />
          </>
        )}
      </PageBody>
    </>
  );
};

export default ForecastPage;
