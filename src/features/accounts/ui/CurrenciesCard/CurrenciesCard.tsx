"use client";

import { useStore } from "@/app/hooks";
import { balancesByCurrency } from "@/features/accounts/model/summary";
import { useI18n } from "@/shared/i18n/useI18n";
import type { BreakdownSegment } from "@/shared/lib/chart";
import { todayISO } from "@/shared/lib/date";
import { CURRENCY_SLOT, CURRENCY_SYMBOL, formatMoney } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";
import CategoryBreakdown from "@/shared/ui/CategoryBreakdown/CategoryBreakdown";

import styles from "./CurrenciesCard.module.scss";

// The money in the accounts by currency; nothing while there is only one
const CurrenciesCard = () => {
  const { state } = useStore();
  const { t } = useI18n();
  const base = state.settings.baseCurrency;
  const rows = balancesByCurrency(state, todayISO());
  if (rows.length < 2) return null;
  const segments: BreakdownSegment[] = rows.map((row) => ({
    id: row.currency,
    label: row.currency,
    icon: CURRENCY_SYMBOL[row.currency],
    value: row.base,
    colorSlot: CURRENCY_SLOT[row.currency],
  }));
  // The amount in its own currency under a foreign currency's row
  const native = (id: string) => {
    const row = rows.find((entry) => entry.currency === id);
    if (!row || row.currency === base) return null;
    return <p className={styles.native}>{formatMoney(row.native, row.currency)}</p>;
  };

  return (
    <Card title={t("accounts.byCurrency")} subtitle={t("accounts.mix.subtitle", { currency: base })} icon="globe">
      <CategoryBreakdown segments={segments} currency={base} rowExtra={native} />
    </Card>
  );
};

export default CurrenciesCard;
