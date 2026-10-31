"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import { brandInfo } from "@/features/accounts/model/brands";
import { gameLabel } from "@/features/accounts/model/games";
import { ACCOUNT_KINDS } from "@/features/accounts/model/kinds";
import { balanceInBase } from "@/features/accounts/model/summary";
import { displayCurrencies } from "@/features/data/model/currencies";
import { accountBalances } from "@/features/data/model/finmath";
import type { AccountKind, SavingsAccount } from "@/features/data/model/types";
import { usePersistentState } from "@/shared/hooks/usePersistentState";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { todayISO } from "@/shared/lib/date";
import { matchesQuery, oneOf, sortItems, type SortDirection, LIST_TOOLS_AT } from "@/shared/lib/listing";
import { convert, formatMoney } from "@/shared/lib/money";
import AddButton from "@/shared/ui/AddButton/AddButton";
import Card from "@/shared/ui/Card/Card";
import EmptyState from "@/shared/ui/EmptyState/EmptyState";
import FilterPills from "@/shared/ui/FilterPills/FilterPills";
import Icon from "@/shared/ui/Icon/Icon";
import SearchInput from "@/shared/ui/SearchInput/SearchInput";
import SortSelect from "@/shared/ui/SortSelect/SortSelect";
import Toolbar from "@/shared/ui/Toolbar/Toolbar";

import AccountRow from "./AccountRow";

import styles from "./AccountsCard.module.scss";

type AccountSort = "name" | "balance" | "kind";

interface AccountsCardProps {
  onAdd: () => void;
  onEdit: (account: SavingsAccount) => void;
}

// Every account as a card, searched, filtered and sorted, over the total
const AccountsCard = ({ onAdd, onEdit }: AccountsCardProps) => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const { settings } = state;
  const base = settings.baseCurrency;
  const today = todayISO();
  const balances = accountBalances(state, today);
  const shown = displayCurrencies(state);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<AccountKind | "all">("all");
  const [showEmpty, setShowEmpty] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [sort, setSort] = usePersistentState<AccountSort>("acc.sort", "balance", oneOf(["name", "balance", "kind"]));
  const [direction, setDirection] = usePersistentState<SortDirection>("acc.dir", "desc", oneOf(["asc", "desc"]));

  // The name of a kind of account
  const kindLabel = (value: AccountKind) => t(`accountKind.${value}`);
  // The key of the chosen order
  const sortKey = (account: SavingsAccount) => {
    if (sort === "name") return account.name.toLocaleLowerCase();
    if (sort === "kind")
      return `${String(ACCOUNT_KINDS.findIndex((item) => item.value === account.kind))}|${account.name}`;
    return balanceInBase(state, account, balances);
  };
  const counts = new Map<AccountKind, number>();
  for (const account of state.savings) counts.set(account.kind, (counts.get(account.kind) ?? 0) + 1);
  const visible = sortItems(
    state.savings.filter(
      (account) =>
        (kind === "all" || account.kind === kind) &&
        matchesQuery(
          query,
          account.name,
          kindLabel(account.kind),
          brandInfo(account.bank)?.name,
          gameLabel(account.game, account.gameName),
          account.currency,
        ),
    ),
    sortKey,
    direction,
  );
  const filtered = query.trim() !== "" || kind !== "all";
  // Whether an account in use holds nothing
  const isEmpty = (account: SavingsAccount) => !account.archived && Math.abs(balances.get(account.id) ?? 0) < 0.005;
  const emptyCount = filtered ? 0 : visible.filter(isEmpty).length;
  const archivedCount = filtered ? 0 : visible.filter((account) => account.archived).length;
  // Whether an account shows: a search finds all, folded ones wait for their button
  const isListed = (account: SavingsAccount) =>
    filtered || (account.archived ? showArchived : showEmpty || !isEmpty(account));
  const listed = visible.filter(isListed);
  const shownTotal = visible.reduce((sum, account) => sum + balanceInBase(state, account, balances), 0);
  const kinds = [
    { value: "all" as const, label: t("filter.all"), count: state.savings.length },
    ...ACCOUNT_KINDS.filter((item) => counts.has(item.value)).map((item) => ({
      value: item.value,
      label: `${item.icon} ${kindLabel(item.value)}`,
      count: counts.get(item.value) ?? 0,
    })),
  ];

  return (
    <Card
      title={t("balance.accounts")}
      subtitle={t("balance.accounts.subtitle")}
      icon="bank"
      action={state.savings.length > 0 ? <AddButton size="sm" onClick={onAdd} label={t("common.add")} /> : undefined}
    >
      {state.savings.length === 0 ? (
        <EmptyState
          icon={<Icon name="card" />}
          title={t("balance.accounts.empty")}
          hint={t("balance.accounts.empty.hint")}
          action={<AddButton variant="primary" onClick={onAdd} label={t("common.add")} />}
        />
      ) : (
        <div>
          {state.savings.length >= LIST_TOOLS_AT && (
            <>
              <Toolbar>
                <SearchInput value={query} onChange={setQuery} placeholder={t("balance.accounts.search")} />
                <SortSelect<AccountSort>
                  value={sort}
                  onChange={setSort}
                  options={[
                    { value: "balance", label: t("sort.balance") },
                    { value: "name", label: t("sort.name") },
                    { value: "kind", label: t("sort.kind") },
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
          {visible.length === 0 && <p className={styles.none}>{t("filter.noMatches")}</p>}
          <div className={styles.cards}>
            {listed.map((account) => (
              <AccountRow key={account.id} account={account} balance={balances.get(account.id) ?? 0} onEdit={onEdit} />
            ))}
          </div>
          {emptyCount > 0 && (
            <button
              type="button"
              onClick={() => setShowEmpty(!showEmpty)}
              aria-expanded={showEmpty}
              className={styles.toggle}
            >
              <Icon name="chevronDown" size={14} strokeWidth={2.4} className={cx(showEmpty && styles.flipped)} />
              {showEmpty ? t("balance.accounts.hideEmpty") : tp("balance.accounts.showEmpty", emptyCount)}
            </button>
          )}
          {archivedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowArchived(!showArchived)}
              aria-expanded={showArchived}
              className={styles.toggle}
            >
              <Icon name="chevronDown" size={14} strokeWidth={2.4} className={cx(showArchived && styles.flipped)} />
              {showArchived ? t("balance.accounts.hideArchived") : tp("balance.accounts.showArchived", archivedCount)}
            </button>
          )}
          {filtered && visible.length > 0 && (
            <div className={styles.total}>
              <span className={styles.totalLabel}>{t("balance.accounts.shownTotal")}</span>
              <span className={styles.totalValues}>
                {shown.map((currency) => (
                  <span key={currency} className={styles.totalCell}>
                    {formatMoney(convert(shownTotal, base, currency, settings.rates), currency, { exact: true })}
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default AccountsCard;
