"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import type { RecurringRule } from "@/features/data/model/types";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import { looksLikeFixedPayment, plansBookedAsSpending } from "@/features/transactions/model/categories";
import {
  monthlyFlow,
  nextPosting,
  recurringStatus,
  statusCounts,
  type RecurringView,
} from "@/features/transactions/model/recurring";
import RecurringSheet from "@/features/transactions/ui/RecurringSheet/RecurringSheet";
import StopPlansSheet from "@/features/transactions/ui/StopPlansSheet/StopPlansSheet";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatDateShort, formatMonthText, monthOf, todayISO } from "@/shared/lib/date";
import { sortItems, LIST_TOOLS_AT } from "@/shared/lib/listing";
import { formatMoney } from "@/shared/lib/money";
import AddButton from "@/shared/ui/AddButton/AddButton";
import Button from "@/shared/ui/Button/Button";
import Callout from "@/shared/ui/Callout/Callout";
import Card from "@/shared/ui/Card/Card";
import EmptyState from "@/shared/ui/EmptyState/EmptyState";
import FilterPills from "@/shared/ui/FilterPills/FilterPills";
import Icon from "@/shared/ui/Icon/Icon";
import SummaryPanel from "@/shared/ui/SummaryPanel/SummaryPanel";
import Unit from "@/shared/ui/Unit/Unit";

import RecurringRow from "./RecurringRow";

import styles from "./RecurringCard.module.scss";

interface RecurringCardProps {
  month: string;
}

// The monthly rules: their net a month, the next posting and a list by status
const RecurringCard = ({ month }: RecurringCardProps) => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const category = useCategoryName();
  const [view, setView] = useState<RecurringView>("now");
  const [target, setTarget] = useState<RecurringRule | "new" | null>(null);
  const [stopping, setStopping] = useState(false);
  const base = state.settings.baseCurrency;
  const today = todayISO();
  const isCurrent = month === monthOf(today);
  const categoryById = new Map(state.categories.map((entry) => [entry.id, entry]));

  const counts = statusCounts(state.recurring, month);
  const visible = sortItems(
    state.recurring.filter((rule) => view === "all" || recurringStatus(rule, month) === view),
    (rule) => rule.dayOfMonth,
    "asc",
  );
  const views = (
    [
      { value: "now", label: t("tx.rec.view.now"), count: counts.now },
      { value: "upcoming", label: t("tx.rec.view.upcoming"), count: counts.upcoming },
      { value: "ended", label: t("tx.rec.view.ended"), count: counts.ended },
      { value: "all", label: t("tx.rec.view.all"), count: state.recurring.length },
    ] satisfies { value: RecurringView; label: string; count: number }[]
  ).filter((option) => option.value === "now" || option.value === "all" || option.count > 0 || option.value === view);
  const active = state.recurring.filter((rule) => recurringStatus(rule, month) === "now");
  const flow = monthlyFlow(state, active);
  const booked = isCurrent ? plansBookedAsSpending(state, month) : [];
  const plans = booked.filter((rule) => !looksLikeFixedPayment(categoryById.get(rule.categoryId)));
  const next = isCurrent ? nextPosting(active, today) : undefined;
  // Opens an empty rule
  const add = () => setTarget("new");

  return (
    <Card
      title={t("tx.rec")}
      subtitle={t("tx.rec.subtitle")}
      icon="repeat"
      action={state.recurring.length > 0 ? <AddButton size="sm" onClick={add} label={t("common.add")} /> : undefined}
    >
      {state.recurring.length === 0 ? (
        <EmptyState
          icon={<Icon name="repeat" />}
          title={t("tx.rec.empty")}
          hint={t("tx.rec.empty.hint")}
          action={<AddButton onClick={add} label={t("common.add")} />}
        />
      ) : (
        <>
          {state.recurring.length >= LIST_TOOLS_AT && (
            <SummaryPanel
              className={styles.block}
              value={
                <>
                  {formatMoney(flow.in - flow.out, base, { compact: true, sign: true })}
                  <Unit>{t("common.perMonth")}</Unit>
                </>
              }
              tone={flow.in >= flow.out ? "income" : "expense"}
              meta={[
                tp("settings.categories.rules", active.length),
                next ? t("tx.rec.next", { date: formatDateShort(next) }) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            >
              {flow.in > 0 && flow.out > 0 && (
                <p className={styles.split}>
                  <span className={styles.out}>−{formatMoney(flow.out, base, { compact: true })}</span>
                  {" · "}
                  <span className={styles.in}>+{formatMoney(flow.in, base, { compact: true })}</span>
                </p>
              )}
            </SummaryPanel>
          )}
          {plans.length > 0 && (
            <Callout tone="tip" title={tp("tx.rec.plans.title", plans.length)} className={styles.block}>
              <p>
                {t("tx.rec.plans.body", {
                  names: plans.map((rule) => category(categoryById.get(rule.categoryId))).join(", "),
                })}
              </p>
              <Button size="sm" variant="ghost" className={styles.choose} onClick={() => setStopping(true)}>
                {t("tx.rec.plans.choose")}
              </Button>
            </Callout>
          )}
          {state.recurring.length >= LIST_TOOLS_AT && (
            <div className={styles.block}>
              <FilterPills label={t("tx.rec.view")} options={views} value={view} onChange={setView} />
            </div>
          )}
          {visible.length === 0 ? (
            <p className={styles.none}>
              {view === "now" ? t("tx.rec.noneThisMonth", { month: formatMonthText(month) }) : t("filter.noMatches")}
            </p>
          ) : (
            <ul className={styles.rows}>
              {visible.map((rule) => (
                <RecurringRow key={rule.id} rule={rule} status={recurringStatus(rule, month)} onOpen={setTarget} />
              ))}
            </ul>
          )}
        </>
      )}

      {target && (
        <RecurringSheet key={target === "new" ? "new" : target.id} target={target} onClose={() => setTarget(null)} />
      )}
      {stopping && <StopPlansSheet rules={booked} onClose={() => setStopping(false)} />}
    </Card>
  );
};

export default RecurringCard;
