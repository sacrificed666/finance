import type { ReactNode } from "react";

import { cx } from "@/shared/lib/cx";

import type { IconName } from "../Icon/icons";
import SubjectMark from "../SubjectMark/SubjectMark";
import HeroStatCell, { type HeroStat } from "./HeroStatCell";

import styles from "./PageHero.module.scss";

export type { HeroStat };

interface PageHeroProps {
  label?: string;
  icon?: IconName;
  action?: ReactNode;
  value?: ReactNode;
  sub?: string;
  delta?: { text: string; good: boolean };
  note?: string;
  lead?: ReactNode;
  aside?: ReactNode;
  stats?: HeroStat[];
  side?: ReactNode;
}

// A hero without figures under its headline
const NO_STATS: HeroStat[] = [];

// The grid of the figures by their count; two share a row at every width
const LAYOUT: Partial<Record<number, string>> = { 1: styles.one, 3: styles.three, 4: styles.four };

// The opening row: a lit tile with the figure, then its figures as tiles
const PageHero = ({
  label,
  icon,
  action,
  value,
  sub,
  delta,
  note,
  lead,
  aside,
  stats = NO_STATS,
  side,
}: PageHeroProps) => {
  const beside = Boolean(side) || stats.length > 0;
  return (
    <section className={cx(styles.hero, beside && styles.withSide, Boolean(side) && styles.ownSide)}>
      <div className={styles.tile}>
        {(Boolean(label) || Boolean(action)) && (
          <div className={styles.head}>
            {label && (
              <div className={styles.heading}>
                {icon && <SubjectMark icon={icon} />}
                <h2 className={styles.title}>{label}</h2>
              </div>
            )}
            {action}
          </div>
        )}

        <div className={cx(styles.body, Boolean(aside) && styles.withAside)}>
          <div className={styles.lead}>
            {lead ?? (
              <>
                <p className={styles.value}>{value}</p>
                {sub && <p className={styles.sub}>{sub}</p>}
                {delta && <p className={cx(styles.delta, delta.good ? styles.income : styles.expense)}>{delta.text}</p>}
                {note && <p className={styles.note}>{note}</p>}
              </>
            )}
          </div>
          {aside && <div className={styles.aside}>{aside}</div>}
        </div>
      </div>

      {side ??
        (stats.length > 0 && (
          <ul className={cx(styles.stats, LAYOUT[stats.length])}>
            {stats.map((stat, index) => (
              <HeroStatCell key={stat.label} stat={stat} wide={stats.length === 3 && index === 2} />
            ))}
          </ul>
        ))}
    </section>
  );
};

export default PageHero;
