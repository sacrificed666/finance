"use client";

import type { gamification } from "@/features/profile/model/achievements";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatNumber } from "@/shared/lib/money";
import Badge from "@/shared/ui/Badge/Badge";
import Icon from "@/shared/ui/Icon/Icon";
import type { IconName } from "@/shared/ui/Icon/icons";
import ProgressMeter from "@/shared/ui/ProgressMeter/ProgressMeter";

import styles from "./ProfileHero.module.scss";

type XpSource = "tracking" | "consistency" | "results" | "achievements";

// Where experience comes from, each with its icon
const SOURCES: readonly { id: XpSource; icon: IconName }[] = [
  { id: "tracking", icon: "edit" },
  { id: "consistency", icon: "calendar" },
  { id: "results", icon: "trend" },
  { id: "achievements", icon: "trophy" },
];

interface LevelSummaryProps {
  g: ReturnType<typeof gamification>;
}

// The level in a ring, its rank, the way to the next and experience by source
const LevelSummary = ({ g }: LevelSummaryProps) => {
  const { t, tk } = useI18n();
  const { level, xp } = g;
  return (
    <div>
      <div className={styles.level}>
        <div className={styles.ring} style={{ "--p": Math.round(level.progress * 100) }}>
          <span className={styles.ringFace} />
          <span className={styles.ringLabel}>{t("profile.level.label")}</span>
          <span className={styles.ringValue}>{level.level}</span>
        </div>
        <div className={styles.levelText}>
          <p className={styles.rank}>{tk(`level.rank.${String(level.rank)}`, "")}</p>
          <p className={styles.xp}>
            {t("profile.level.xp", { xp: formatNumber(level.xp, 0) })}
            {xp.thisMonth > 0 && (
              <Badge tone="accent">{t("profile.level.thisMonth", { xp: formatNumber(xp.thisMonth, 0) })}</Badge>
            )}
          </p>
          <div className={styles.meter}>
            <ProgressMeter value={level.progress} max={1} label={t("profile.level.progress")} />
          </div>
          <p className={styles.toNext}>
            {t("profile.level.toNext", { xp: formatNumber(level.next - level.xp, 0), level: level.level + 1 })}
          </p>
          {level.nextRankLevel !== null && (
            <p className={styles.nextRank}>
              {t("profile.level.nextRank", {
                rank: tk(`level.rank.${String(level.rank + 1)}`, ""),
                level: level.nextRankLevel,
              })}
            </p>
          )}
        </div>
      </div>
      <dl className={styles.sources}>
        {SOURCES.map((source) => (
          <div key={source.id} className={styles.source} title={t(`profile.level.source.${source.id}.hint`)}>
            <dt className={styles.sourceName}>
              <Icon name={source.icon} size={13} />
              {t(`profile.level.source.${source.id}`)}
            </dt>
            <dd className={styles.sourceXp}>{formatNumber(xp[source.id], 0)} XP</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

export default LevelSummary;
