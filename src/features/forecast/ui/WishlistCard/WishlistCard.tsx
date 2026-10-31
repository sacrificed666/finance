"use client";

import { useState } from "react";

import { useStore } from "@/app/hooks";
import type { WishItem } from "@/features/data/model/types";
import { WISH_SLOT, wishlistPlan } from "@/features/forecast/model/wishlist";
import WishSheet from "@/features/forecast/ui/WishSheet/WishSheet";
import { useI18n } from "@/shared/i18n/useI18n";
import { currentMonth, formatMonthText } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import AddButton from "@/shared/ui/AddButton/AddButton";
import Card from "@/shared/ui/Card/Card";
import IconDisc from "@/shared/ui/IconDisc/IconDisc";
import SummaryPanel from "@/shared/ui/SummaryPanel/SummaryPanel";

import styles from "./WishlistCard.module.scss";

// The things wanted, by priority, with when the savings pace affords each
const WishlistCard = () => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const base = state.settings.baseCurrency;
  const [sheet, setSheet] = useState<WishItem | "new" | null>(null);
  const { pace, items, total, affordable } = wishlistPlan(state, currentMonth());

  // When a wish happens: its own month, when it is affordable, or its priority
  const whenOf = (wish: WishItem) => {
    if (wish.month) return t("wish.planned", { month: formatMonthText(wish.month) });
    const month = affordable.get(wish.id);
    return month ? t("wish.affordable", { month: formatMonthText(month) }) : t(`wish.priority.${wish.priority}`);
  };

  return (
    <Card
      title={t("wish.title")}
      subtitle={t("wish.subtitle")}
      icon="star"
      action={<AddButton size="sm" onClick={() => setSheet("new")} label={t("common.add")} />}
    >
      {items.length === 0 ? (
        <p className={styles.empty}>{t("wish.empty")}</p>
      ) : (
        <>
          <SummaryPanel
            className={styles.summary}
            value={formatMoney(total, base, { compact: true })}
            meta={pace > 0 ? t("wish.pace", { amount: formatMoney(pace, base, { compact: true }) }) : t("wish.noPace")}
          >
            <p className={styles.count}>{tp("wish.count", items.length)}</p>
          </SummaryPanel>
          <ul className={styles.rows}>
            {items.map((wish) => (
              <li key={wish.id}>
                <button type="button" onClick={() => setSheet(wish)} className={styles.row}>
                  <IconDisc colorSlot={WISH_SLOT[wish.priority]} size="md">
                    {wish.icon}
                  </IconDisc>
                  <span className={styles.text}>
                    <span className={styles.name}>{wish.name}</span>
                    <span className={styles.when}>{whenOf(wish)}</span>
                  </span>
                  <span className={styles.price}>{formatMoney(wish.price, wish.currency, { compact: true })}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {sheet && <WishSheet key={sheet === "new" ? "new" : sheet.id} target={sheet} onClose={() => setSheet(null)} />}
    </Card>
  );
};

export default WishlistCard;
