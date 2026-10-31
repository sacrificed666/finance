"use client";

import { useId, useState } from "react";

import { useStore } from "@/app/hooks";
import { useAccountGroups } from "@/features/accounts/model/useAccountGroups";
import {
  extraFilters,
  isFiltering,
  NO_FILTER,
  type LedgerFilter,
  type LedgerKind,
  type LedgerScope,
  type LedgerSort,
  type LedgerTiming,
} from "@/features/transactions/model/ledger";
import { useCategoryGroups } from "@/features/transactions/model/useCategoryGroups";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatMonthShort } from "@/shared/lib/date";
import type { SortDirection } from "@/shared/lib/listing";
import Button from "@/shared/ui/Button/Button";
import FilterPills from "@/shared/ui/FilterPills/FilterPills";
import Icon from "@/shared/ui/Icon/Icon";
import OptionPicker from "@/shared/ui/OptionPicker/OptionPicker";
import SearchInput from "@/shared/ui/SearchInput/SearchInput";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";
import SortSelect from "@/shared/ui/SortSelect/SortSelect";
import Toolbar from "@/shared/ui/Toolbar/Toolbar";
import ToolbarSlot from "@/shared/ui/ToolbarSlot/ToolbarSlot";

import styles from "./LedgerCard.module.scss";

interface LedgerToolbarProps {
  month: string;
  filter: LedgerFilter;
  onFilter: (filter: LedgerFilter) => void;
  kind: LedgerKind;
  onKind: (kind: LedgerKind) => void;
  scope: LedgerScope;
  onScope: (scope: LedgerScope) => void;
  sort: LedgerSort;
  onSort: (sort: LedgerSort) => void;
  direction: SortDirection;
  onDirection: (direction: SortDirection) => void;
  showTiming: boolean;
}

// The ledger's search, kind, period and order; the rarer filters fold away
const LedgerToolbar = ({
  month,
  filter,
  onFilter,
  kind,
  onKind,
  scope,
  onScope,
  sort,
  onSort,
  direction,
  onDirection,
  showTiming,
}: LedgerToolbarProps) => {
  const { state } = useStore();
  const { t } = useI18n();
  const categoryGroups = useCategoryGroups(
    state.categories,
    ["expense", "income"],
    [{ value: "", label: t("filter.allCategories") }],
  );
  const accountGroups = useAccountGroups(state.savings, [{ value: "", label: t("filter.allAccounts") }]);
  const tags = [...new Set(state.transactions.flatMap((tx) => tx.tags ?? []))].toSorted((a, b) => a.localeCompare(b));
  const tagGroups = [
    { items: [{ value: "", label: t("filter.allTags") }, ...tags.map((tag) => ({ value: tag, label: `#${tag}` }))] },
  ];
  const panel = useId();
  const [more, setMore] = useState(false);
  const extra = extraFilters(filter);
  // On phones the period hides in the panel, so the button counts it there
  const phoneExtra = extra + (scope === "month" ? 0 : 1);
  const periods = (
    <SegmentedControl<LedgerScope>
      size="sm"
      label={t("filter.period")}
      options={[
        { value: "month", label: formatMonthShort(month) },
        { value: "quarter", label: t("filter.period.quarter") },
        { value: "year", label: month.slice(0, 4) },
        { value: "all", label: t("filter.period.all") },
      ]}
      value={scope}
      onChange={onScope}
    />
  );
  // Changes one filter and keeps the others
  const set = (change: Partial<LedgerFilter>) => onFilter({ ...filter, ...change });

  return (
    <>
      <Toolbar className={styles.toolbar}>
        <SearchInput value={filter.query} onChange={(query) => set({ query })} placeholder={t("tx.search")} />
        <SegmentedControl<LedgerKind>
          size="sm"
          label={t("tx.kind")}
          className={styles.kinds}
          options={[
            { value: "all", label: t("tx.kind.all") },
            { value: "expense", label: t("tx.kind.out") },
            { value: "income", label: t("tx.kind.in") },
            { value: "transfer", label: "⇄" },
          ]}
          value={kind}
          onChange={onKind}
        />
      </Toolbar>
      <Toolbar className={styles.toolbar}>
        <div className={styles.wideOnly}>{periods}</div>
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={more}
          aria-controls={panel}
          className={cx(styles.shrink, more && styles.moreOpen)}
          onClick={() => setMore(!more)}
        >
          <Icon name="filter" size={14} />
          {t("filter.more")}
          {extra > 0 && (
            <>
              {" "}
              <span className={cx(styles.moreCount, styles.countWide)}>{extra}</span>
            </>
          )}
          {phoneExtra > 0 && (
            <span aria-hidden className={cx(styles.moreCount, styles.countPhone)}>
              {phoneExtra}
            </span>
          )}
        </Button>
        <SortSelect<LedgerSort>
          value={sort}
          onChange={onSort}
          options={[
            { value: "date", label: t("sort.date") },
            { value: "amount", label: t("sort.amount") },
            { value: "category", label: t("filter.category") },
            { value: "account", label: t("common.account") },
          ]}
          direction={direction}
          onDirectionChange={onDirection}
        />
        {isFiltering(filter) && (
          <Button variant="ghost" size="sm" className={styles.shrink} onClick={() => onFilter(NO_FILTER)}>
            {t("filter.reset")}
          </Button>
        )}
      </Toolbar>
      {more && (
        <div id={panel} className={styles.more}>
          <div className={cx(styles.phoneOnly, styles.morePeriods)}>{periods}</div>
          <Toolbar className={styles.moreRow}>
            <ToolbarSlot>
              <OptionPicker
                size="sm"
                label={t("filter.category")}
                value={filter.categoryId}
                onChange={(categoryId) => set({ categoryId })}
                groups={categoryGroups}
              />
            </ToolbarSlot>
            {state.savings.length > 0 && (
              <ToolbarSlot>
                <OptionPicker
                  size="sm"
                  label={t("filter.account")}
                  value={filter.accountId}
                  onChange={(accountId) => set({ accountId })}
                  groups={accountGroups}
                />
              </ToolbarSlot>
            )}
            {tags.length > 0 && (
              <ToolbarSlot>
                <OptionPicker
                  size="sm"
                  label={t("filter.tag")}
                  value={filter.tag}
                  onChange={(tag) => set({ tag })}
                  groups={tagGroups}
                />
              </ToolbarSlot>
            )}
            {showTiming && (
              <FilterPills<LedgerTiming>
                label={t("filter.timing")}
                options={[
                  { value: "all", label: t("filter.all") },
                  { value: "posted", label: t("filter.timing.posted") },
                  { value: "planned", label: t("filter.timing.planned") },
                ]}
                value={filter.timing}
                onChange={(timing) => set({ timing })}
              />
            )}
          </Toolbar>
        </div>
      )}
    </>
  );
};

export default LedgerToolbar;
