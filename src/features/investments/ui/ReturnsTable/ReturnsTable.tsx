"use client";

import type { MouseEvent } from "react";

import type { Investment } from "@/features/data/model/types";
import { investmentColorSlot } from "@/features/investments/model/kinds";
import { positionReturns } from "@/features/investments/model/positions";
import PositionMark from "@/features/investments/ui/PositionMark/PositionMark";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatMoney, formatPercent } from "@/shared/lib/money";
import IconDisc from "@/shared/ui/IconDisc/IconDisc";
import Money from "@/shared/ui/Money/Money";

import styles from "./ReturnsTable.module.scss";

interface ReturnsTableProps {
  positions: Investment[];
  today: string;
  yearOut: string;
  onOpen: (inv: Investment) => void;
}

// The positions in a table: their value, what they earned and what comes next
const ReturnsTable = ({ positions, today, yearOut, onOpen }: ReturnsTableProps) => {
  const { t } = useI18n();
  // Opens a position from its name without the row opening it again
  const open = (event: MouseEvent, inv: Investment) => {
    event.stopPropagation();
    onOpen(inv);
  };
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.left}>{t("balance.investments")}</th>
          <th className={styles.valueHead}>{t("sort.value")}</th>
          <th className={styles.figureHead}>{t("investments.returns.soFar")}</th>
          <th className={styles.figureHead}>{t("investments.returns.next")}</th>
        </tr>
      </thead>
      <tbody>
        {positions.map((inv) => {
          const { snap, earned, gainPct, nextYear, nextYearPct } = positionReturns(inv, today, yearOut);
          return (
            <tr key={inv.id} className={styles.row} onClick={() => onOpen(inv)}>
              <td>
                <button type="button" className={styles.open} onClick={(event) => open(event, inv)}>
                  <IconDisc colorSlot={investmentColorSlot(inv.kind)} size="md" className={styles.disc}>
                    <PositionMark inv={inv} />
                  </IconDisc>
                  <span className={styles.name}>{inv.name}</span>
                  <span className={styles.meta}>
                    {t(`investmentKind.${inv.kind}`)} · {inv.currency}
                  </span>
                </button>
              </td>
              <td className={styles.valueCell}>
                <Money amount={snap.value} currency={inv.currency} compact className={styles.value} />
              </td>
              <td className={styles.right}>
                <span className={cx(styles.figure, earned >= 0 ? styles.income : styles.expense)}>
                  {formatMoney(earned, inv.currency, { compact: true, sign: true })}
                </span>
                <span className={styles.share}>{formatPercent(gainPct)}</span>
              </td>
              <td className={styles.right}>
                <span className={cx(styles.figure, nextYear > 0 ? styles.strong : styles.quiet)}>
                  {nextYear === 0 ? "-" : formatMoney(nextYear, inv.currency, { compact: true, sign: true })}
                </span>
                {nextYear !== 0 && (
                  <span className={styles.share}>{t("balance.perYear", { pct: formatPercent(nextYearPct) })}</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default ReturnsTable;
