"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import type { Investment } from "@/features/data/model/types";
import { removeInvestment } from "@/features/investments/model/investmentForm";
import AllocationCard from "@/features/investments/ui/AllocationCard/AllocationCard";
import InvestmentsCard from "@/features/investments/ui/InvestmentsCard/InvestmentsCard";
import InvestmentSheet from "@/features/investments/ui/InvestmentSheet/InvestmentSheet";
import InvestmentsHero from "@/features/investments/ui/InvestmentsHero/InvestmentsHero";
import ScheduleCard from "@/features/investments/ui/ScheduleCard/ScheduleCard";
import PricesFootnote from "@/features/market/ui/PricesFootnote/PricesFootnote";
import { useI18n } from "@/shared/i18n/useI18n";
import AddButton from "@/shared/ui/AddButton/AddButton";
import Card from "@/shared/ui/Card/Card";
import ConfirmDialog from "@/shared/ui/ConfirmDialog/ConfirmDialog";
import EmptyState from "@/shared/ui/EmptyState/EmptyState";
import Icon from "@/shared/ui/Icon/Icon";
import PageBody from "@/shared/ui/PageBody/PageBody";
import PageHeader from "@/shared/ui/PageHeader/PageHeader";
import Split from "@/shared/ui/Split/Split";

interface Removing {
  kind: "delete" | "withdraw";
  id: string;
}

// The investments page: the positions, their allocation and their schedule
const InvestmentsPage = () => {
  const { state, update } = useStore();
  const { t } = useI18n();
  const [target, setTarget] = useState<Investment | "new" | null>(null);
  const [renew, setRenew] = useState(false);
  const [removing, setRemoving] = useState<Removing | null>(null);
  const deleting = removing?.kind === "delete" ? state.investments.find((inv) => inv.id === removing.id) : undefined;
  const withdrawing =
    removing?.kind === "withdraw" ? state.investments.find((inv) => inv.id === removing.id) : undefined;
  // Opens the sheet of a position, for renewing it when asked
  const open = (inv: Investment | "new", again = false) => {
    setRenew(again);
    setTarget(inv);
  };
  // Opens an empty sheet for a new position
  const add = () => open("new");

  // Removes the position being deleted or withdrawn, with an undo
  const confirmRemove = () => {
    if (!removing) return;
    const { kind, id } = removing;
    update((s) => removeInvestment(s, id), kind === "delete" ? t("balance.inv.deleted") : t("investments.withdrawn"));
    if (kind === "delete") setTarget(null);
    setRemoving(null);
  };

  return (
    <>
      <PageHeader
        title={t("nav.investments")}
        action={
          state.investments.length > 0 ? (
            <AddButton variant="primary" onClick={add} label={t("balance.addInvestment")} />
          ) : undefined
        }
      />

      <PageBody>
        {state.investments.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Icon name="trend" />}
              title={t("investments.empty")}
              hint={t("investments.empty.hint")}
              action={<AddButton variant="primary" onClick={add} label={t("balance.addInvestment")} />}
            />
          </Card>
        ) : (
          <>
            <InvestmentsHero />
            <Split
              stickySide
              main={<InvestmentsCard onAdd={add} onEdit={(inv) => open(inv)} />}
              side={
                <>
                  <AllocationCard />
                  <ScheduleCard
                    onOpen={(inv) => open(inv)}
                    onRenew={(inv) => open(inv, true)}
                    onClose={(inv) => setRemoving({ kind: "withdraw", id: inv.id })}
                  />
                </>
              }
            />
          </>
        )}
        <PricesFootnote scope="investments" />
      </PageBody>

      {target && (
        <InvestmentSheet
          key={target === "new" ? "new" : `${target.id}${renew ? ":renew" : ""}`}
          target={target}
          renew={renew}
          onClose={() => setTarget(null)}
          onDelete={(id) => setRemoving({ kind: "delete", id })}
        />
      )}
      <ConfirmDialog
        open={deleting !== undefined}
        onClose={() => setRemoving(null)}
        onConfirm={confirmRemove}
        title={t("balance.inv.deleteTitle")}
        message={t("balance.inv.deleteMessage", { name: deleting?.name ?? "" })}
      />
      <ConfirmDialog
        open={withdrawing !== undefined}
        onClose={() => setRemoving(null)}
        onConfirm={confirmRemove}
        title={t("investments.withdraw.title")}
        message={t("investments.withdraw.message", { name: withdrawing?.name ?? "" })}
        confirmLabel={t("investments.withdraw")}
      />
    </>
  );
};

export default InvestmentsPage;
