import Link from "next/link";

import { cx } from "@/shared/lib/cx";

import Icon from "../Icon/Icon";
import type { IconName } from "../Icon/icons";
import SubjectMark from "../SubjectMark/SubjectMark";

import styles from "./PageHero.module.scss";

export interface HeroStat {
  label: string;
  icon?: IconName;
  value: string;
  tone?: "income" | "expense";
  delta?: { text: string; good: boolean };
  hint?: string;
  href?: string;
}

interface HeroStatCellProps {
  stat: HeroStat;
  wide?: boolean;
}

// One figure under a page's headline: a tile that links to its page if it has one
const HeroStatCell = ({ stat, wide = false }: HeroStatCellProps) => {
  const body = (
    <>
      <p className={styles.statLabel}>
        {stat.icon && <SubjectMark icon={stat.icon} />}
        <span className={styles.statName}>{stat.label}</span>
        {stat.href && <Icon name="arrowRight" size={12} strokeWidth={2.4} className={styles.statArrow} />}
      </p>
      <p className={cx(styles.statValue, stat.tone ? styles[stat.tone] : styles.plain)}>{stat.value}</p>
      {stat.delta && (
        <p className={cx(styles.statDelta, stat.delta.good ? styles.income : styles.expense)}>{stat.delta.text}</p>
      )}
      {stat.hint && <p className={cx(styles.statHint, stat.delta && styles.statHintClose)}>{stat.hint}</p>}
    </>
  );
  return (
    <li className={cx(wide && styles.wideStat)}>
      {stat.href ? (
        <Link href={stat.href} className={cx(styles.stat, styles.statLink)}>
          {body}
        </Link>
      ) : (
        <div className={styles.stat}>{body}</div>
      )}
    </li>
  );
};

export default HeroStatCell;
