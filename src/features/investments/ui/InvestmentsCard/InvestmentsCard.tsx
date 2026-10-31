"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import { investmentAt } from "@/features/data/model/finmath";
import type { Investment, InvestmentKind } from "@/features/data/model/types";
import { INVESTMENT_KINDS } from "@/features/investments/model/kinds";
import { oneYearFrom, positionReturns } from "@/features/investments/model/positions";
import PositionCard from "@/features/investments/ui/PositionCard/PositionCard";
import ReturnsTable from "@/features/investments/ui/ReturnsTable/ReturnsTable";
import { usePersistentState } from "@/shared/hooks/usePersistentState";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { todayISO } from "@/shared/lib/date";
import { matchesQuery, oneOf, sortItems, type SortDirection, LIST_TOOLS_AT } from "@/shared/lib/listing";
import { convert } from "@/shared/lib/money";
import AddButton from "@/shared/ui/AddButton/AddButton";
import Card from "@/shared/ui/Card/Card";
import FilterPills from "@/shared/ui/FilterPills/FilterPills";
import SearchInput from "@/shared/ui/SearchInput/SearchInput";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";
import SortSelect from "@/shared/ui/SortSelect/SortSelect";
import Toolbar from "@/shared/ui/Toolbar/Toolbar";

import styles from "./InvestmentsCard.module.scss";

type InvestmentSort = "value" | "gain" | "name" | "start";

type InvestmentView = "cards" | "table";

interface InvestmentsCardProps {
  onAdd: () => void;
  onEdit: (inv: Investment) => void;
}

// Every position as cards or a table, searched, filtered by kind and sorted
const InvestmentsCard = ({ onAdd, onEdit }: InvestmentsCardProps) => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const { settings } = state;
  const today = todayISO();
  const yearOut = oneYearFrom(today);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<InvestmentKind | "all">("all");
  const [sort, setSort] = usePersistentState<InvestmentSort>(
    "inv.sort",
    "value",
    oneOf(["value", "gain", "name", "start"]),
  );
  const [direction, setDirection] = usePersistentState<SortDirection>("inv.dir", "desc", oneOf(["asc", "desc"]));
  const [view, setView] = usePersistentState<InvestmentView>("inv.view", "cards", oneOf(["cards", "table"]));

  // The name of a kind of position
  const kindLabel = (value: InvestmentKind) => t(`investmentKind.${value}`);
  // The key of the chosen order
  const sortKey = (inv: Investment) => {
    if (sort === "name") return inv.name.toLocaleLowerCase();
    if (sort === "gain") return positionReturns(inv, today, yearOut).gainPct;
    if (sort === "start") return inv.startDate;
    return convert(investmentAt(inv, today).value, inv.currency, settings.baseCurrency, settings.rates);
  };
  const counts = new Map<InvestmentKind, number>();
  for (const inv of state.investments) counts.set(inv.kind, (counts.get(inv.kind) ?? 0) + 1);
  const visible = sortItems(
    state.investments.filter(
      (inv) =>
        (kind === "all" || inv.kind === kind) &&
        matchesQuery(query, inv.name, kindLabel(inv.kind), inv.fund, inv.currency),
    ),
    sortKey,
    direction,
  );
  const kinds = [
    { value: "all" as const, label: t("filter.all"), count: state.investments.length },
    ...INVESTMENT_KINDS.filter((item) => counts.has(item.value)).map((item) => ({
      value: item.value,
      label: `${item.icon} ${kindLabel(item.value)}`,
      count: counts.get(item.value) ?? 0,
    })),
  ];

  // The positions in the chosen view, or a note that none match
  const positions = () => {
    if (visible.length === 0) return <p className={styles.none}>{t("filter.noMatches")}</p>;
    if (view === "table" && visible.length > 1) {
      return <ReturnsTable positions={visible} today={today} yearOut={yearOut} onOpen={onEdit} />;
    }
    return (
      <div className={cx(styles.cards, visible.length > 1 && styles.columns)}>
        {visible.map((inv) => (
          <PositionCard
            key={inv.id}
            inv={inv}
            today={today}
            yearOut={yearOut}
            onEdit={() => onEdit(inv)}
            className={styles.card}
          />
        ))}
      </div>
    );
  };

  return (
    <Card
      title={t("balance.investments")}
      subtitle={tp("balance.inv.positions", state.investments.length)}
      icon="trend"
      action={
        <div className={styles.actions}>
          {state.investments.length > 1 && (
            <SegmentedControl<InvestmentView>
              size="sm"
              label={t("investments.view")}
              options={[
                { value: "cards", label: t("investments.view.cards") },
                { value: "table", label: t("investments.view.table") },
              ]}
              value={view}
              onChange={setView}
            />
          )}
          <AddButton size="sm" onClick={onAdd} label={t("common.add")} />
        </div>
      }
    >
      {state.investments.length >= LIST_TOOLS_AT && (
        <>
          <Toolbar>
            <SearchInput value={query} onChange={setQuery} placeholder={t("balance.inv.search")} />
            <SortSelect<InvestmentSort>
              value={sort}
              onChange={setSort}
              options={[
                { value: "value", label: t("sort.value") },
                { value: "gain", label: t("sort.gain") },
                { value: "name", label: t("sort.name") },
                { value: "start", label: t("sort.startDate") },
              ]}
              direction={direction}
              onDirectionChange={setDirection}
            />
          </Toolbar>
          {kinds.length > 2 && (
            <div className={styles.kinds}>
              <FilterPills label={t("filter.kind")} options={kinds} value={kind} onChange={setKind} />
            </div>
          )}
        </>
      )}
      {positions()}
    </Card>
  );
};

export default InvestmentsCard;
