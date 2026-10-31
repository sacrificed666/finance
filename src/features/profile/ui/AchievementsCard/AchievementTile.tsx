"use client";

import { MONEY_ACHIEVEMENTS, type AchievementState } from "@/features/profile/model/achievements";
import { TIER_COLOR } from "@/features/profile/model/badges";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { areAmountsHidden, formatNumber, hiddenFigure } from "@/shared/lib/money";
import ProgressMeter from "@/shared/ui/ProgressMeter/ProgressMeter";

import TierMedal from "./TierMedal";

import styles from "./AchievementsCard.module.scss";

interface AchievementTileProps {
  achievement: AchievementState;
}

// An achievement: medal, name, tier, what it asks and, until earned, progress
const AchievementTile = ({ achievement: a }: AchievementTileProps) => {
  const { t, tk } = useI18n();
  const title = tk(`ach.${a.id}.title`, a.id);
  // The way to a sum of money would give the sum away while amounts are hidden
  const secret = areAmountsHidden() && MONEY_ACHIEVEMENTS.has(a.id);
  return (
    <li className={cx(styles.tile, !a.unlocked && styles.locked)}>
      <TierMedal tier={a.tier} icon={a.icon} unlocked={a.unlocked} />
      <span className={styles.body}>
        <span className={styles.titleLine}>
          <span className={styles.title}>{title}</span>
          <span className={styles.tier} style={{ "--tier": TIER_COLOR[a.tier] }}>
            {t(`profile.ach.tier.${a.tier}`)}
          </span>
        </span>
        <span data-public className={styles.description}>
          {tk(`ach.${a.id}.desc`, "")}
        </span>
        {a.unlocked ? (
          <span className={styles.hidden}>{t("profile.ach.unlocked")}</span>
        ) : secret ? (
          <span className={styles.count}>
            {hiddenFigure()} / {hiddenFigure()}
          </span>
        ) : (
          <span className={styles.progress}>
            <ProgressMeter value={a.progress} max={1} label={title} />
            <span className={styles.count}>
              <span>
                {formatNumber(Math.min(a.current, a.target), 1)} / {formatNumber(a.target, 1)}
              </span>
              <span>{Math.round(a.progress * 100)}%</span>
            </span>
          </span>
        )}
      </span>
      <span className={styles.xp}>+{formatNumber(a.xp, 0)} XP</span>
    </li>
  );
};

export default AchievementTile;
