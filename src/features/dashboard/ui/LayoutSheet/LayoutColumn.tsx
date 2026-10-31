"use client";

import { CARD_TITLES, moveCard, showCard } from "@/features/dashboard/model/layout";
import type { DashboardCardId, DashboardLayout } from "@/features/data/model/types";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import Icon from "@/shared/ui/Icon/Icon";
import Switch from "@/shared/ui/Switch/Switch";

import styles from "./LayoutSheet.module.scss";

interface LayoutColumnProps {
  title: string;
  ids: DashboardCardId[];
  layout: DashboardLayout;
  onChange: (next: DashboardLayout) => void;
}

// One column of cards, each with buttons to move it and a switch to show it
const LayoutColumn = ({ title, ids, layout, onChange }: LayoutColumnProps) => {
  const { t } = useI18n();
  return (
    <section className={styles.column}>
      <h3 className={styles.title}>{title}</h3>
      <ul className={styles.cards}>
        {ids.map((id, index) => {
          const name = t(CARD_TITLES[id]);
          const shown = !layout.hidden.includes(id);
          return (
            <li key={id} className={styles.card}>
              <span className={cx(styles.name, !shown && styles.hidden)}>{name}</span>
              <button
                type="button"
                aria-label={t("dash.layout.up", { name })}
                disabled={index === 0}
                onClick={() => onChange(moveCard(layout, id, -1))}
                className={styles.move}
              >
                <Icon name="chevronDown" size={15} strokeWidth={2.2} className={styles.up} />
              </button>
              <button
                type="button"
                aria-label={t("dash.layout.down", { name })}
                disabled={index === ids.length - 1}
                onClick={() => onChange(moveCard(layout, id, 1))}
                className={styles.move}
              >
                <Icon name="chevronDown" size={15} strokeWidth={2.2} />
              </button>
              <Switch
                checked={shown}
                onChange={(show) => onChange(showCard(layout, id, show))}
                label={t("dash.layout.show", { name })}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default LayoutColumn;
