"use client";

import Link from "next/link";

import { useMeasure } from "@/shared/hooks/useMeasure";
import { useI18n } from "@/shared/i18n/useI18n";
import { type BreakdownSegment, seriesColor } from "@/shared/lib/chart";
import { cx } from "@/shared/lib/cx";
import { type Currency, formatMoney } from "@/shared/lib/money";
import { squarify } from "@/shared/lib/treemap";

import ChartTable from "../ChartTable/ChartTable";

import styles from "./CategoryMap.module.scss";

interface CategoryMapProps {
  segments: BreakdownSegment[];
  currency: Currency;
  height?: number;
  chosen?: string;
  onChoose?: (id: string) => void;
  hrefOf?: (id: string) => string;
}

// Room a cell needs for its name and figure, and for its icon alone
const FULL = { width: 112, height: 72 };
const ICON = { width: 30, height: 30 };
// A short cell's height, and the width of its edges and of each figure character
const SHORT_HEIGHT = 52;
const SHORT_EDGE = 22;
const CHAR_WIDTH = 7.4;

// How much of a cell's content fits: everything, the figure, the icon or nothing
const fitOf = (width: number, height: number, figure: string) => {
  if (width >= FULL.width && height >= FULL.height) return "full";
  if (height >= SHORT_HEIGHT && width >= SHORT_EDGE + figure.length * CHAR_WIDTH) return "short";
  if (width >= ICON.width && height >= ICON.height) return "icon";
  return "bare";
};

// Where the money went as tiles as large as their shares, as toggles or links
const CategoryMap = ({ segments, currency, height = 260, chosen, onChoose, hrefOf }: CategoryMapProps) => {
  const { t } = useI18n();
  const [ref, width] = useMeasure<HTMLDivElement>();
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const cells = squarify(segments, (segment) => segment.value, width, height);
  if (total <= 0) return null;

  // A part's share of the whole, rounded
  const share = (segment: BreakdownSegment) => `${((segment.value / total) * 100).toFixed(0)}%`;
  // A part's amount in short form, or shorter still for a narrow cell
  const amount = (segment: BreakdownSegment, tight = false) =>
    formatMoney(segment.value, currency, { compact: true, tight });
  const picking = chosen !== undefined && chosen !== "" && segments.some((segment) => segment.id === chosen);

  return (
    <div>
      <div ref={ref} aria-hidden={onChoose || hrefOf ? undefined : true} className={styles.map} style={{ height }}>
        {cells.map(({ item, x, y, width: wide, height: tall }, index) => {
          const roomy = fitOf(wide, tall, amount(item));
          const fit = roomy === "icon" ? fitOf(wide, tall, amount(item, true)) : roomy;
          const figure = amount(item, roomy !== fit);
          const content = (
            <>
              {fit === "full" && (
                <>
                  <span className={styles.name}>
                    <span className={styles.icon}>{item.icon}</span>
                    <span className={styles.label}>{item.label}</span>
                    <span className={styles.share}>{share(item)}</span>
                  </span>
                  <span className={styles.amount}>{amount(item)}</span>
                </>
              )}
              {fit === "short" && (
                <>
                  <span className={styles.icon}>{item.icon}</span>
                  <span className={styles.small}>{figure}</span>
                </>
              )}
              {fit === "icon" && <span className={styles.icon}>{item.icon}</span>}
            </>
          );
          const props = {
            title: `${item.label}: ${amount(item)}`,
            className: cx(
              styles.cell,
              fit !== "full" && styles.tight,
              fit === "icon" && styles.iconOnly,
              (onChoose ?? hrefOf) && styles.live,
              picking && item.id !== chosen && styles.faded,
            ),
            style: {
              left: x,
              top: y,
              width: wide,
              height: tall,
              "--cell": seriesColor(item.colorSlot),
              "--i": index,
            },
          };
          const name = `${item.label}: ${amount(item)}, ${share(item)}`;
          if (onChoose) {
            return (
              <button
                key={item.id}
                type="button"
                aria-label={name}
                aria-pressed={item.id === chosen}
                onClick={() => onChoose(item.id)}
                {...props}
              >
                {content}
              </button>
            );
          }
          if (hrefOf) {
            return (
              <Link key={item.id} href={hrefOf(item.id)} aria-label={name} {...props}>
                {content}
              </Link>
            );
          }
          return (
            <div key={item.id} {...props}>
              {content}
            </div>
          );
        })}
      </div>
      <ChartTable
        caption={t("chart.breakdownAria")}
        columns={[t("common.name"), t("common.amount"), "%"]}
        rows={segments.map((segment) => ({
          key: segment.id,
          cells: [segment.label, amount(segment), share(segment)],
        }))}
      />
    </div>
  );
};

export default CategoryMap;
