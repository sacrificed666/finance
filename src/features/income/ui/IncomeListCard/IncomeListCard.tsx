"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import type { Transaction } from "@/features/data/model/types";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import { INCOME_SCOPES, incomeInBase, incomeMatcher, type IncomeScope } from "@/features/income/model/income";
import { useCategoryGroups } from "@/features/transactions/model/useCategoryGroups";
import { usePersistentState } from "@/shared/hooks/usePersistentState";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatMonth, monthOf, todayISO } from "@/shared/lib/date";
import { oneOf, sortItems, type SortDirection } from "@/shared/lib/listing";
import { formatMoney } from "@/shared/lib/money";
import AddButton from "@/shared/ui/AddButton/AddButton";
import Card from "@/shared/ui/Card/Card";
import EmptyState from "@/shared/ui/EmptyState/EmptyState";
import Icon from "@/shared/ui/Icon/Icon";
import OptionPicker from "@/shared/ui/OptionPicker/OptionPicker";
import SearchInput from "@/shared/ui/SearchInput/SearchInput";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";
import SortSelect from "@/shared/ui/SortSelect/SortSelect";
import Toolbar from "@/shared/ui/Toolbar/Toolbar";
import ToolbarSlot from "@/shared/ui/ToolbarSlot/ToolbarSlot";

import IncomeRow from "./IncomeRow";

import styles from "./IncomeListCard.module.scss";

type IncomeSort = "date" | "amount";

interface IncomeListCardProps {
  onAdd: () => void;
  onEdit: (tx: Transaction) => void;
}

// Every income, received or planned, by month or by amount, searched and filtered
const IncomeListCard = ({ onAdd, onEdit }: IncomeListCardProps) => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const category = useCategoryName();
  const base = state.settings.baseCurrency;
  const today = todayISO();
  const categoryGroups = useCategoryGroups(
    state.categories,
    ["income"],
    [{ value: "", label: t("filter.allCategories") }],
  );
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [scope, setScope] = useState<IncomeScope>("received");
  const [sort, setSort] = usePersistentState<IncomeSort>("income.sort", "date", oneOf(["date", "amount"]));
  const [direction, setDirection] = usePersistentState<SortDirection>("income.dir", "desc", oneOf(["asc", "desc"]));

  const incomes = state.transactions.filter((tx) => tx.type === "income");
  const plannedCount = incomes.filter((tx) => tx.date > today).length;
  // What a search looks through: the note, category, account and tax
  const texts = (tx: Transaction) => {
    const entry = state.categories.find((item) => item.id === tx.categoryId);
    return [
      tx.note,
      entry ? category(entry) : undefined,
      state.savings.find((account) => account.id === tx.accountId)?.name,
      tx.tax?.label,
    ];
  };
  const visible = incomes.filter(incomeMatcher(state, today, scope, categoryId, query, texts));
  const filtering = query.trim() !== "" || categoryId !== "";
  const byMonth = new Map<string, Transaction[]>();
  for (const tx of visible) byMonth.set(monthOf(tx.date), [...(byMonth.get(monthOf(tx.date)) ?? []), tx]);
  // Clears the search and the category
  const reset = () => {
    setQuery("");
    setCategoryId("");
  };

  let subtitle = t("income.scope.received.subtitle");
  if (scope === "planned") subtitle = t("income.scope.planned.subtitle");
  else if (scope === "all") subtitle = t("income.scope.all.subtitle");

  return (
    <Card
      title={t("income.all")}
      subtitle={subtitle}
      icon="banknote"
      action={
        plannedCount > 0 ? (
          <SegmentedControl<IncomeScope>
            size="sm"
            label={t("income.scope.label")}
            options={INCOME_SCOPES.map((value) => ({
              value,
              label:
                value === "planned"
                  ? `${t("income.scope.planned")} (${String(plannedCount)})`
                  : t(`income.scope.${value}`),
            }))}
            value={scope}
            onChange={setScope}
          />
        ) : undefined
      }
    >
      {incomes.length === 0 ? (
        <EmptyState
          icon={<Icon name="banknote" />}
          title={t("income.empty.list")}
          hint={t("income.empty.list.hint")}
          action={<AddButton variant="primary" onClick={onAdd} label={t("income.add")} />}
        />
      ) : (
        <>
          <Toolbar>
            <SearchInput value={query} onChange={setQuery} placeholder={t("income.search")} />
            <ToolbarSlot>
              <OptionPicker
                size="sm"
                label={t("filter.category")}
                value={categoryId}
                onChange={setCategoryId}
                groups={categoryGroups}
              />
            </ToolbarSlot>
            <SortSelect<IncomeSort>
              value={sort}
              onChange={setSort}
              options={[
                { value: "date", label: t("sort.date") },
                { value: "amount", label: t("sort.amount") },
              ]}
              direction={direction}
              onDirectionChange={setDirection}
            />
          </Toolbar>
          {filtering && (
            <p className={styles.shown}>
              {tp("filter.shown", visible.length, { total: incomes.length })}
              <button type="button" className={styles.reset} onClick={reset}>
                {t("filter.reset")}
              </button>
            </p>
          )}
          {visible.length === 0 && <p className={styles.none}>{t("filter.noMatches")}</p>}
          {visible.length > 0 && sort === "amount" && (
            <ul className={styles.rows}>
              {sortItems(visible, (tx) => incomeInBase(state, tx), direction).map((tx) => (
                <IncomeRow key={tx.id} tx={tx} onEdit={onEdit} />
              ))}
            </ul>
          )}
          {visible.length > 0 && sort === "date" && (
            <div className={styles.months}>
              {sortItems([...byMonth.keys()], (month) => month, direction).map((month) => {
                const entries = sortItems(byMonth.get(month) ?? [], (tx) => `${tx.date}|${tx.id}`, direction);
                const subtotal = entries.reduce((sum, tx) => sum + incomeInBase(state, tx), 0);
                return (
                  <section key={month}>
                    <h3 className={styles.monthHead}>
                      <span>
                        <span className={styles.monthName}>{formatMonth(month)}</span>
                        <span className={styles.monthCount}> · {tp("common.entries", entries.length)}</span>
                      </span>
                      {entries.length > 1 && (
                        <span className={styles.subtotal}>{formatMoney(subtotal, base, { sign: true })}</span>
                      )}
                    </h3>
                    <ul className={styles.monthRows}>
                      {entries.map((tx) => (
                        <IncomeRow key={tx.id} tx={tx} onEdit={onEdit} />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default IncomeListCard;
