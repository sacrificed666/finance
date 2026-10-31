"use client";

import { useStore } from "@/app/hooks";
import { topPlaces } from "@/features/transactions/model/places";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatMonth } from "@/shared/lib/date";
import { formatMoney } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";
import ProgressMeter from "@/shared/ui/ProgressMeter/ProgressMeter";

import styles from "./PlacesCard.module.scss";

interface PlacesCardProps {
  month: string;
  chosen?: string;
  onChoose?: (name: string) => void;
}

// The month's costliest places by their notes; a tap finds them in the ledger
const PlacesCard = ({ month, chosen = "", onChoose }: PlacesCardProps) => {
  const { state } = useStore();
  const { t, tp } = useI18n();
  const base = state.settings.baseCurrency;
  const places = topPlaces(state, month);
  const [first] = places;
  if (!first || places.length < 2) return null;
  return (
    <Card title={t("tx.places")} subtitle={t("tx.places.subtitle", { month: formatMonth(month) })} icon="tag">
      <ul className={styles.rows}>
        {places.map((place) => {
          const content = (
            <>
              <span className={styles.head}>
                <span className={styles.name} title={place.name}>
                  {place.name}
                </span>
                <span className={styles.total}>{formatMoney(place.total, base, { compact: true })}</span>
              </span>
              <ProgressMeter value={place.total} max={first.total} label={place.name} tone="expense" />
              <span className={styles.count}>{tp("tx.places.times", place.count)}</span>
            </>
          );
          const picked = chosen.trim().toLocaleLowerCase() === place.name.toLocaleLowerCase();
          return (
            <li key={place.key}>
              {onChoose ? (
                <button
                  type="button"
                  aria-pressed={picked}
                  onClick={() => onChoose(place.name)}
                  className={cx(styles.row, styles.tap, picked && styles.picked)}
                >
                  {content}
                </button>
              ) : (
                <div className={styles.row}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
};

export default PlacesCard;
