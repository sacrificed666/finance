"use client";

import { useStore } from "@/app/hooks";
import { gamification } from "@/features/profile/model/achievements";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatNumber, formatPercent } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";
import CardLink from "@/shared/ui/CardLink/CardLink";
import ProgressMeter from "@/shared/ui/ProgressMeter/ProgressMeter";

import styles from "./ProgressCard.module.scss";

// The colour of each health grade
const GRADE_TONE = {
  excellent: styles.good,
  good: styles.good,
  fair: styles.fair,
  weak: styles.weak,
};

// The level, the health score and the achievement closest to unlocking
const ProgressCard = () => {
  const { state } = useStore();
  const { t, tk } = useI18n();
  const { level, health, achievements } = gamification(state);
  const unlocked = achievements.filter((achievement) => achievement.unlocked).length;
  const nextUp = achievements
    .filter((achievement) => !achievement.unlocked)
    .toSorted((a, b) => b.progress - a.progress)
    .at(0);

  return (
    <Card title={t("dash.progress")} icon="trophy" action={<CardLink href="/profile" />}>
      <div className={styles.tiles}>
        <div className={styles.tile}>
          <p className={styles.caption}>{t("profile.level.label")}</p>
          <p className={styles.figure}>{level.level}</p>
          <p className={styles.hint}>{tk(`level.rank.${String(level.rank)}`, "")}</p>
        </div>
        <div className={styles.tile}>
          <p className={styles.caption}>{t("profile.health.label")}</p>
          <p className={cx(styles.figure, health.hasData && GRADE_TONE[health.grade])}>
            {health.hasData ? health.score : "-"}
          </p>
          <p className={styles.hint}>
            {health.hasData ? t(`health.grade.${health.grade}`) : t("profile.health.waiting")}
          </p>
        </div>
      </div>
      <div className={styles.level}>
        <ProgressMeter value={level.progress} max={1} label={t("profile.level.progress")} />
        <p className={styles.toNext}>
          {t("profile.level.toNext", { xp: formatNumber(level.next - level.xp, 0), level: level.level + 1 })}
          {" · "}
          {t("profile.ach.count", { n: unlocked, total: achievements.length })}
        </p>
      </div>
      {nextUp && (
        <p className={styles.next}>
          <span aria-hidden className={styles.emoji}>
            {nextUp.icon}
          </span>
          <span className={styles.nextName}>
            {t("dash.nextAchievement", { name: tk(`ach.${nextUp.id}.title`, nextUp.id) })}
          </span>
          <span className={styles.share}>{formatPercent(nextUp.progress * 100, 0)}</span>
        </p>
      )}
    </Card>
  );
};

export default ProgressCard;
