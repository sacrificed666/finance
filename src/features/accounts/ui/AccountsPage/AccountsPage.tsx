"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import { accountUsage, deleteAccount } from "@/features/accounts/model/accounts";
import { deleteDebt } from "@/features/accounts/model/debtForm";
import { deleteReceivable } from "@/features/accounts/model/receivableForm";
import AccountsCard from "@/features/accounts/ui/AccountsCard/AccountsCard";
import AccountSheet from "@/features/accounts/ui/AccountSheet/AccountSheet";
import AccountsHero from "@/features/accounts/ui/AccountsHero/AccountsHero";
import AllocationCard from "@/features/accounts/ui/AllocationCard/AllocationCard";
import BankCheckCard from "@/features/accounts/ui/BankCheckCard/BankCheckCard";
import CurrenciesCard from "@/features/accounts/ui/CurrenciesCard/CurrenciesCard";
import DebtsCard from "@/features/accounts/ui/DebtsCard/DebtsCard";
import DebtSheet from "@/features/accounts/ui/DebtSheet/DebtSheet";
import GoalsCard from "@/features/accounts/ui/GoalsCard/GoalsCard";
import GoalSheet from "@/features/accounts/ui/GoalSheet/GoalSheet";
import ReceivablesCard from "@/features/accounts/ui/ReceivablesCard/ReceivablesCard";
import ReceivableSheet from "@/features/accounts/ui/ReceivableSheet/ReceivableSheet";
import ReconcileSheet from "@/features/accounts/ui/ReconcileSheet/ReconcileSheet";
import type { Debt, Goal, Receivable, SavingsAccount } from "@/features/data/model/types";
import PricesFootnote from "@/features/market/ui/PricesFootnote/PricesFootnote";
import { useI18n } from "@/shared/i18n/useI18n";
import AddButton from "@/shared/ui/AddButton/AddButton";
import Callout from "@/shared/ui/Callout/Callout";
import ConfirmDialog from "@/shared/ui/ConfirmDialog/ConfirmDialog";
import PageBody from "@/shared/ui/PageBody/PageBody";
import PageHeader from "@/shared/ui/PageHeader/PageHeader";
import Split from "@/shared/ui/Split/Split";

import styles from "./AccountsPage.module.scss";

interface Deleting {
  kind: "account" | "debt" | "receivable";
  id: string;
}

// The accounts page: the accounts, the bank check, goals, debts and loans
const AccountsPage = () => {
  const { state, update } = useStore();
  const { t, tp } = useI18n();
  const [account, setAccount] = useState<SavingsAccount | "new" | null>(null);
  const [debt, setDebt] = useState<Debt | "new" | null>(null);
  const [receivable, setReceivable] = useState<Receivable | "new" | null>(null);
  const [goal, setGoal] = useState<Goal | "new" | null>(null);
  const [reconcile, setReconcile] = useState<{ id: string; amount?: number } | null>(null);
  const [deleting, setDeleting] = useState<Deleting | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const deletingAccount =
    deleting?.kind === "account" ? state.savings.find((item) => item.id === deleting.id) : undefined;
  const deletingDebt = deleting?.kind === "debt" ? state.debts.find((item) => item.id === deleting.id) : undefined;
  const deletingReceivable =
    deleting?.kind === "receivable" ? state.receivables.find((item) => item.id === deleting.id) : undefined;

  // What else deleting the account changes, as a sentence after the warning
  const impact = () => {
    if (!deletingAccount) return "";
    const usage = accountUsage(state, deletingAccount.id);
    const parts = [
      usage.entries > 0 && tp("balance.acc.impact.entries", usage.entries),
      usage.transfers > 0 && tp("balance.acc.impact.transfers", usage.transfers),
      usage.recurring > 0 && tp("balance.acc.impact.recurring", usage.recurring),
      usage.subscriptions > 0 && tp("balance.acc.impact.subscriptions", usage.subscriptions),
    ].filter(Boolean);
    return parts.length > 0 ? ` ${parts.join("; ")}.` : "";
  };

  // Deletes what is being deleted, with an undo
  const confirmDelete = () => {
    if (!deleting) return;
    const { kind, id } = deleting;
    if (kind === "account") {
      update(
        (s) =>
          deleteAccount(s, id, {
            from: (name) => t("balance.acc.transferFrom", { name }),
            to: (name) => t("balance.acc.transferTo", { name }),
            unnamed: t("balance.acc.unnamed"),
          }),
        t("balance.acc.deleted"),
      );
      setAccount(null);
    } else if (kind === "debt") {
      update((s) => deleteDebt(s, id), t("balance.debt.deleted"));
      setDebt(null);
    } else {
      update((s) => deleteReceivable(s, id), t("receivables.deleted"));
      setReceivable(null);
    }
    setDeleting(null);
  };

  return (
    <>
      <PageHeader
        title={t("nav.accounts")}
        action={
          <div className={styles.actions}>
            {state.debts.length === 0 && <AddButton onClick={() => setDebt("new")} label={t("balance.addDebt")} />}
            {state.receivables.length === 0 && (
              <AddButton onClick={() => setReceivable("new")} label={t("receivables.add")} />
            )}
            {state.goals.length === 0 && <AddButton onClick={() => setGoal("new")} label={t("goals.add")} />}
            <AddButton variant="primary" onClick={() => setAccount("new")} label={t("balance.addAccount")} />
          </div>
        }
      />

      <PageBody>
        {priceError && (
          <Callout tone="warning" title={t("balance.prices.errorTitle")}>
            {priceError}
          </Callout>
        )}
        <AccountsHero />
        <Split
          stickySide
          main={
            <>
              <AccountsCard onAdd={() => setAccount("new")} onEdit={setAccount} />
              <DebtsCard onAdd={() => setDebt("new")} onEdit={setDebt} />
              <AllocationCard />
            </>
          }
          side={
            <>
              <BankCheckCard onMatch={(id, amount) => setReconcile({ id, amount })} />
              <CurrenciesCard />
              <GoalsCard onAdd={() => setGoal("new")} onEdit={setGoal} />
              <ReceivablesCard onAdd={() => setReceivable("new")} onEdit={setReceivable} />
            </>
          }
        />
        <PricesFootnote scope="accounts" />
      </PageBody>

      {goal && <GoalSheet key={goal === "new" ? "new" : goal.id} target={goal} onClose={() => setGoal(null)} />}
      {account && (
        <AccountSheet
          key={account === "new" ? "new" : account.id}
          target={account}
          onClose={() => setAccount(null)}
          onDelete={(id) => setDeleting({ kind: "account", id })}
          onReconcile={(id) => {
            setAccount(null);
            setReconcile({ id });
          }}
          onPriceError={setPriceError}
        />
      )}
      {reconcile && (
        <ReconcileSheet
          key={reconcile.id}
          accountId={reconcile.id}
          amount={reconcile.amount}
          onClose={() => setReconcile(null)}
        />
      )}
      {debt && (
        <DebtSheet
          key={debt === "new" ? "new" : debt.id}
          target={debt}
          onClose={() => setDebt(null)}
          onDelete={(id) => setDeleting({ kind: "debt", id })}
        />
      )}
      {receivable && (
        <ReceivableSheet
          key={receivable === "new" ? "new" : receivable.id}
          target={receivable}
          onClose={() => setReceivable(null)}
          onDelete={(id) => setDeleting({ kind: "receivable", id })}
        />
      )}

      <ConfirmDialog
        open={deletingAccount !== undefined}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title={t("balance.acc.deleteTitle")}
        message={t("balance.acc.deleteMessage", { name: deletingAccount?.name ?? "" }) + impact()}
      />
      <ConfirmDialog
        open={deletingReceivable !== undefined}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title={t("receivables.deleteTitle")}
        message={t("receivables.deleteMessage", { name: deletingReceivable?.name ?? "" })}
      />
      <ConfirmDialog
        open={deletingDebt !== undefined}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title={t("balance.debt.deleteTitle")}
        message={t("balance.debt.deleteMessage", { name: deletingDebt?.name ?? "" })}
      />
    </>
  );
};

export default AccountsPage;
