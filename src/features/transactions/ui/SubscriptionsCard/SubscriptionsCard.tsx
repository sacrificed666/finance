"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import {
  subscriptionBillsIn,
  subscriptionMonthlyCost,
  subscriptionsMonthlyTotal,
  subscriptionStatus,
} from "@/features/data/model/finmath";
import type { Subscription } from "@/features/data/model/types";
import type { SubscriptionSuggestion } from "@/features/import/model/import";
import { SUBSCRIPTION_SLOT } from "@/features/transactions/model/schedules";
import {
  SUBSCRIPTION_SORTS,
  subscriptionCounts,
  VIEW_STATUS,
  type SubscriptionSort,
  type SubscriptionView,
} from "@/features/transactions/model/subscriptions";
import SubscriptionSheet from "@/features/transactions/ui/SubscriptionSheet/SubscriptionSheet";
import { usePersistentState } from "@/shared/hooks/usePersistentState";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatMonth, formatMonthText } from "@/shared/lib/date";
import { oneOf, sortItems, type SortDirection, LIST_TOOLS_AT } from "@/shared/lib/listing";
import { formatMoney } from "@/shared/lib/money";
import AddButton from "@/shared/ui/AddButton/AddButton";
import Card from "@/shared/ui/Card/Card";
import EmptyState from "@/shared/ui/EmptyState/EmptyState";
import FilterPills from "@/shared/ui/FilterPills/FilterPills";
import Icon from "@/shared/ui/Icon/Icon";
import SortSelect from "@/shared/ui/SortSelect/SortSelect";
import SummaryPanel from "@/shared/ui/SummaryPanel/SummaryPanel";
import Toolbar from "@/shared/ui/Toolbar/Toolbar";
import Unit from "@/shared/ui/Unit/Unit";

import SubscriptionRow from "./SubscriptionRow";
import Suggestions from "./Suggestions";

import styles from "./SubscriptionsCard.module.scss";

interface SubscriptionsCardProps {
  month: string;
}

// The subscriptions with their cost, by status and order, and suggested ones
const SubscriptionsCard = ({ month }: SubscriptionsCardProps) => {
  const { state } = useStore();
  const { t } = useI18n();
  const { settings } = state;
  const base = settings.baseCurrency;
  const [view, setView] = useState<SubscriptionView>("now");
  const [sort, setSort] = usePersistentState<SubscriptionSort>("subs.sort", "name", oneOf(SUBSCRIPTION_SORTS));
  const [direction, setDirection] = usePersistentState<SortDirection>("subs.dir", "asc", oneOf(["asc", "desc"]));
  const [target, setTarget] = useState<Subscription | "new" | null>(null);
  const [suggested, setSuggested] = useState<SubscriptionSuggestion | null>(null);

  const slot = state.categories.find((entry) => entry.id === "cat-subs")?.colorSlot ?? SUBSCRIPTION_SLOT;
  const billed = state.subscriptions.filter((subscription) => subscriptionBillsIn(subscription, month));
  const total = subscriptionsMonthlyTotal(billed, base, settings);
  const counts = subscriptionCounts(state.subscriptions, month);
  // The key of the chosen order
  const sortKey = (subscription: Subscription) => {
    if (sort === "price") return subscriptionMonthlyCost(subscription, base, settings);
    if (sort === "day") return subscription.dayOfMonth;
    return subscription.name.toLocaleLowerCase();
  };
  const visible = sortItems(
    state.subscriptions.filter(
      (subscription) => view === "all" || subscriptionStatus(subscription, month) === VIEW_STATUS[view],
    ),
    sortKey,
    direction,
  );
  const views = (
    [
      { value: "now", label: t("tx.subs.view.now"), count: counts.active },
      { value: "upcoming", label: t("tx.subs.view.upcoming"), count: counts.upcoming },
      { value: "ended", label: t("tx.subs.view.ended"), count: counts.ended },
      { value: "paused", label: t("tx.subs.view.paused"), count: counts.paused },
      { value: "all", label: t("tx.subs.view.all"), count: state.subscriptions.length },
    ] satisfies { value: SubscriptionView; label: string; count: number }[]
  ).filter((option) => option.value === "now" || option.value === "all" || option.count > 0 || option.value === view);
  // The views only filter something once a subscription is not billing this month
  const filterable = counts.active !== state.subscriptions.length || view !== "now";
  // Opens an empty subscription
  const add = () => setTarget("new");

  return (
    <Card
      title={t("tx.subs")}
      subtitle={t("tx.subs.subtitle")}
      icon="device"
      action={
        state.subscriptions.length > 0 ? <AddButton size="sm" onClick={add} label={t("common.add")} /> : undefined
      }
    >
      <Suggestions onAdd={setSuggested} />
      {state.subscriptions.length === 0 ? (
        <EmptyState
          icon={<Icon name="device" />}
          title={t("tx.subs.empty")}
          hint={t("tx.subs.empty.hint")}
          action={<AddButton onClick={add} label={t("common.add")} />}
        />
      ) : (
        <>
          <SummaryPanel
            className={styles.summary}
            value={
              <>
                {formatMoney(total, base)}
                <Unit>{t("common.perMonth")}</Unit>
              </>
            }
            meta={`${formatMonth(month)} · ${t("tx.subs.countOf", { n: billed.length, total: state.subscriptions.length })}`}
          >
            <p className={styles.perYear}>
              {t("tx.subs.perYear", { amount: formatMoney(total * 12, base, { compact: true }) })}
            </p>
          </SummaryPanel>
          {(filterable || visible.length >= LIST_TOOLS_AT) && (
            <Toolbar>
              {filterable && <FilterPills label={t("tx.subs.view")} options={views} value={view} onChange={setView} />}
              {visible.length >= LIST_TOOLS_AT && (
                <SortSelect<SubscriptionSort>
                  value={sort}
                  onChange={setSort}
                  options={[
                    { value: "name", label: t("sort.name") },
                    { value: "price", label: t("sort.price") },
                    { value: "day", label: t("sort.chargeDay") },
                  ]}
                  direction={direction}
                  onDirectionChange={setDirection}
                />
              )}
            </Toolbar>
          )}
          {visible.length === 0 ? (
            <p className={styles.none}>
              {view === "now" ? t("tx.subs.noneThisMonth", { month: formatMonthText(month) }) : t("filter.noMatches")}
            </p>
          ) : (
            <ul className={styles.rows}>
              {visible.map((subscription) => (
                <SubscriptionRow
                  key={subscription.id}
                  subscription={subscription}
                  status={subscriptionStatus(subscription, month)}
                  colorSlot={slot}
                  onOpen={setTarget}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {target && (
        <SubscriptionSheet key={target === "new" ? "new" : target.id} target={target} onClose={() => setTarget(null)} />
      )}
      {suggested && (
        <SubscriptionSheet
          key={`suggested:${suggested.key}`}
          target="new"
          draft={{ ...suggested, price: suggested.amount }}
          onClose={() => setSuggested(null)}
        />
      )}
    </Card>
  );
};

export default SubscriptionsCard;
