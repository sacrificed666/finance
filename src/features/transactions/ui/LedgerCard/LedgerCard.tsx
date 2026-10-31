"use client";

import { useDeferredValue, useState } from "react";

import { useStore } from "@/app/hooks";
import type { Transaction } from "@/features/data/model/types";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import { journalCsv } from "@/features/reports/model/export";
import {
  addTag,
  byDay,
  deleteEntries,
  inScope,
  isFiltering,
  LEDGER_SCOPES,
  LEDGER_SORTS,
  ledgerFileName,
  ledgerMatcher,
  netOf,
  NO_FILTER,
  recategorisable,
  setCategory,
  signedAmount,
  type LedgerKind,
  type LedgerScope,
  type LedgerSort,
} from "@/features/transactions/model/ledger";
import type { LedgerView } from "@/features/transactions/model/useLedgerView";
import { usePersistentState } from "@/shared/hooks/usePersistentState";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatDate, formatMonthText, monthOf, todayISO } from "@/shared/lib/date";
import { downloadFile } from "@/shared/lib/download";
import { oneOf, sortItems, type SortDirection } from "@/shared/lib/listing";
import { formatMoney } from "@/shared/lib/money";
import AddButton from "@/shared/ui/AddButton/AddButton";
import Button from "@/shared/ui/Button/Button";
import Card from "@/shared/ui/Card/Card";
import ConfirmDialog from "@/shared/ui/ConfirmDialog/ConfirmDialog";
import EmptyState from "@/shared/ui/EmptyState/EmptyState";
import Icon from "@/shared/ui/Icon/Icon";

import BulkBar from "./BulkBar";
import LedgerDay from "./LedgerDay";
import LedgerRow from "./LedgerRow";
import LedgerToolbar from "./LedgerToolbar";
import SavedViews from "./SavedViews";

import styles from "./LedgerCard.module.scss";

// The ledger's anchor, which the page scrolls to when a tile or place narrows it
export const LEDGER_ID = "ledger";

interface LedgerCardProps {
  month: string;
  view: LedgerView;
  onAdd: () => void;
  onEdit: (tx: Transaction) => void;
}

// Every entry of a period, searched, filtered, by day or sorted, edited in bulk
const LedgerCard = ({ month, view, onAdd, onEdit }: LedgerCardProps) => {
  const { state, update } = useStore();
  const i18n = useI18n();
  const { t, tp } = i18n;
  const category = useCategoryName();
  const base = state.settings.baseCurrency;
  const today = todayISO();

  const { filter, setFilter, kind, setKind } = view;
  const [kept, setScope] = usePersistentState<LedgerScope>("ledger.scope", "month", oneOf(LEDGER_SCOPES));
  const scope = filter.review ? "all" : kept;
  const [sort, setSort] = usePersistentState<LedgerSort>("ledger.sort", "date", oneOf(LEDGER_SORTS));
  const [direction, setDirection] = usePersistentState<SortDirection>("ledger.dir", "desc", oneOf(["asc", "desc"]));
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const query = useDeferredValue(filter.query);

  const categoryById = new Map(state.categories.map((entry) => [entry.id, entry]));
  const accountById = new Map(state.savings.map((account) => [account.id, account]));
  // What a search looks through: note, category, accounts, currency, date, tags
  const searchTexts = (tx: Transaction) => {
    const entry = categoryById.get(tx.categoryId);
    return [
      tx.note,
      tx.bank?.text,
      entry ? category(entry) : undefined,
      tx.accountId ? accountById.get(tx.accountId)?.name : undefined,
      tx.toAccountId ? accountById.get(tx.toAccountId)?.name : undefined,
      tx.currency,
      formatDate(tx.date),
      ...(tx.tags ?? []),
    ];
  };
  const filtering = isFiltering(filter);
  const scoped = state.transactions.filter((tx) => inScope(tx, scope, month));
  const ledger = scoped.filter(ledgerMatcher(kind, { ...filter, query }, state, today, searchTexts));
  const plannedCount = scoped.filter((tx) => tx.date > today).length;
  const spanning = scope !== "month";
  const net = netOf(state, ledger);
  const days = byDay(ledger);
  const monthCount = state.transactions.filter(
    (tx) => monthOf(tx.date) === month && (kind === "all" || tx.type === kind),
  ).length;
  // The key of the chosen order that is not by date
  const sortKey = (tx: Transaction) => {
    if (sort === "amount") return Math.abs(signedAmount(state, tx));
    if (sort === "category") return category(categoryById.get(tx.categoryId)).toLocaleLowerCase();
    return (tx.accountId ? (accountById.get(tx.accountId)?.name ?? "") : "").toLocaleLowerCase();
  };

  // Ticks an entry, or unticks it
  const toggle = (id: string) =>
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  // Leaves the picking mode with nothing picked
  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };
  // Opens an entry, or ticks it while picking
  const press = (tx: Transaction) => (selecting ? toggle(tx.id) : onEdit(tx));
  // Moves the picked entries the category fits into it
  const recategorise = (categoryId: string) => {
    const ids = recategorisable(state, selected, categoryId);
    if (ids.size === 0) return;
    update(
      (s) => setCategory(s, ids, categoryId),
      tp("tx.bulk.recategorised", ids.size, { category: category(categoryById.get(categoryId)) }),
    );
  };
  // Adds a tag to every picked entry
  const tag = (name: string) =>
    update((s) => addTag(s, selected, name), tp("tx.bulk.tagged", selected.size, { tag: name }));
  // Deletes the picked entries, with an undo
  const removeSelected = () => {
    update((s) => deleteEntries(s, selected), tp("tx.bulk.deleted", selected.size));
    setConfirmDelete(false);
    stopSelecting();
  };
  // Downloads the shown entries as a CSV file
  const download = () =>
    downloadFile(ledgerFileName(scope, month, today), journalCsv(state, ledger, i18n, today), "text/csv;charset=utf-8");
  const allTicked = ledger.length > 0 && ledger.every((tx) => selected.has(tx.id));
  // Picks a kind of entry, which leaves the review queue of every kind
  const pickKind = (next: LedgerKind) => {
    setKind(next);
    if (filter.review) setFilter({ ...filter, review: false });
  };
  // Picks a period, which leaves the review queue of every month
  const pickScope = (next: LedgerScope) => {
    setScope(next);
    if (filter.review) setFilter({ ...filter, review: false });
  };
  // Shows every entry of the period again, of every kind
  const showAll = () => {
    setFilter(NO_FILTER);
    setKind("all");
  };

  let subtitle = tp("tx.ledger.entriesMonth", monthCount, { month: formatMonthText(month) });
  if (filtering && spanning) subtitle = tp("tx.ledger.matchesAll", ledger.length);
  else if (filtering) subtitle = tp("tx.ledger.matchesMonth", ledger.length, { month: formatMonthText(month) });
  // A row of the list, its date shown outside the day groups
  const row = (tx: Transaction, showDate: boolean) => (
    <LedgerRow
      key={tx.id}
      tx={tx}
      showDate={showDate}
      selecting={selecting}
      ticked={selected.has(tx.id)}
      onPress={press}
    />
  );

  return (
    <Card id={LEDGER_ID} title={t("tx.ledger")} subtitle={subtitle} icon="receipt">
      {state.transactions.length > 0 && (
        <>
          <LedgerToolbar
            month={month}
            filter={filter}
            onFilter={setFilter}
            kind={kind}
            onKind={pickKind}
            scope={scope}
            onScope={pickScope}
            sort={sort}
            onSort={setSort}
            direction={direction}
            onDirection={setDirection}
            showTiming={plannedCount > 0}
          />
          <SavedViews
            filter={filter}
            kind={kind}
            scope={scope}
            onApply={(nextFilter, nextKind, nextScope) => {
              setFilter(nextFilter);
              setKind(nextKind);
              setScope(nextScope);
            }}
            onReview={(on) => setFilter({ ...NO_FILTER, review: on })}
          />
          {ledger.length > 0 && (
            <div className={styles.summary}>
              <p className={styles.count}>
                {tp("common.entries", ledger.length)} ·{" "}
                <span className={net >= 0 ? styles.positive : styles.negative}>
                  {formatMoney(net, base, { sign: true, compact: true })}
                </span>
              </p>
              <div className={styles.tools}>
                <button
                  type="button"
                  onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
                  className={cx(styles.tool, selecting && styles.toolOn)}
                >
                  {selecting ? t("tx.bulk.done") : t("tx.bulk.select")}
                </button>
                <button type="button" title={t("export.csvHint")} onClick={download} className={styles.tool}>
                  <Icon name="arrowDown" size={12} strokeWidth={2.4} />
                  CSV
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {ledger.length === 0 && (filtering || scoped.length > 0) && (
        <EmptyState
          icon={<Icon name="search" />}
          title={t("filter.noMatches")}
          hint={spanning ? t("tx.noMatch.all") : t("tx.noMatch.month", { month: formatMonthText(month) })}
          action={
            <Button variant="ghost" onClick={showAll}>
              {t("filter.reset")}
            </Button>
          }
        />
      )}
      {ledger.length === 0 && !filtering && scoped.length === 0 && (
        <EmptyState
          icon={<Icon name="receipt" />}
          title={t("tx.empty")}
          hint={t("tx.empty.hint")}
          action={<AddButton variant="primary" onClick={onAdd} label={t("common.add")} />}
        />
      )}
      {ledger.length > 0 && sort !== "date" && (
        <div className={styles.rows}>{sortItems(ledger, sortKey, direction).map((tx) => row(tx, true))}</div>
      )}
      {ledger.length > 0 && sort === "date" && (
        <div className={styles.days}>
          {sortItems([...days.keys()], (day) => day, direction).map((day) => {
            const entries = days.get(day) ?? [];
            return (
              <LedgerDay key={day} day={day} entries={entries} spanning={spanning} today={today}>
                {entries.map((tx) => row(tx, false))}
              </LedgerDay>
            );
          })}
        </div>
      )}

      {selecting && (
        <BulkBar
          picked={selected.size}
          shown={ledger.length}
          allTicked={allTicked}
          onToggleAll={() => setSelected(allTicked ? new Set() : new Set(ledger.map((tx) => tx.id)))}
          onCategory={recategorise}
          onTag={tag}
          onDelete={() => setConfirmDelete(true)}
        />
      )}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={removeSelected}
        title={tp("tx.bulk.deleteTitle", selected.size)}
        message={t("tx.bulk.deleteMessage")}
        confirmLabel={t("tx.bulk.delete")}
      />
    </Card>
  );
};

export default LedgerCard;
