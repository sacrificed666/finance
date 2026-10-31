"use client";

import { useStore } from "@/app/hooks";
import { expensesByCategory, rollupToParents } from "@/features/data/model/finmath";
import { useCategoryName } from "@/features/data/model/useCategoryName";
import { usePersistentState } from "@/shared/hooks/usePersistentState";
import { useI18n } from "@/shared/i18n/useI18n";
import type { BreakdownSegment } from "@/shared/lib/chart";
import { formatMonth } from "@/shared/lib/date";
import { oneOf } from "@/shared/lib/listing";
import Card from "@/shared/ui/Card/Card";
import CategoryMap from "@/shared/ui/CategoryMap/CategoryMap";
import EmptyState from "@/shared/ui/EmptyState/EmptyState";
import Icon from "@/shared/ui/Icon/Icon";
import SegmentedControl from "@/shared/ui/SegmentedControl/SegmentedControl";

import styles from "./SpendingOverview.module.scss";

const DETAILS = ["groups", "detailed"] as const;

interface SpendingOverviewProps {
  month: string;
  chosen?: string;
  onChoose?: (categoryId: string) => void;
}

// Where the month's money went, in groups or in detail; a tile narrows the ledger
const SpendingOverview = ({ month, chosen, onChoose }: SpendingOverviewProps) => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const category = useCategoryName();
  const base = state.settings.baseCurrency;
  const [detail, setDetail] = usePersistentState<(typeof DETAILS)[number]>("spend.detail", "groups", oneOf(DETAILS));
  const byId = new Map(state.categories.map((entry) => [entry.id, entry]));

  const raw = expensesByCategory(state.transactions, month, state.settings);
  const spend = detail === "groups" ? rollupToParents(raw, state.categories) : raw;
  const segments: BreakdownSegment[] = [...spend.entries()].map(([id, value]) => {
    const entry = byId.get(id);
    return { id, label: category(entry), icon: entry?.icon ?? "❓", value, colorSlot: entry?.colorSlot ?? 3 };
  });
  const hasSubcategorySpend = [...raw.keys()].some((id) => byId.get(id)?.parentId);
  const picked = segments.find((segment) => segment.id === chosen);
  let subtitle = formatMonth(month);
  if (picked) subtitle = `${subtitle} · ${t("tx.where.chosen", { name: picked.label })}`;
  else if (segments.length > 0) subtitle = `${subtitle} · ${tp("common.categories", segments.length)}`;

  if (state.transactions.length === 0) return null;

  return (
    <Card
      title={t("tx.where")}
      subtitle={subtitle}
      icon="pie"
      action={
        hasSubcategorySpend ? (
          <SegmentedControl
            size="sm"
            label={t("tx.where.detail")}
            options={[
              { value: "groups", label: t("tx.where.groups") },
              { value: "detailed", label: t("tx.where.detailed") },
            ]}
            value={detail}
            onChange={setDetail}
          />
        ) : undefined
      }
    >
      {segments.length > 0 ? (
        <div className={styles.breakdown}>
          <CategoryMap segments={segments} currency={base} chosen={chosen} onChoose={onChoose} />
        </div>
      ) : (
        <EmptyState icon={<Icon name="receipt" />} title={t("tx.where.empty")} hint={t("tx.where.empty.hint")} />
      )}
    </Card>
  );
};

export default SpendingOverview;
