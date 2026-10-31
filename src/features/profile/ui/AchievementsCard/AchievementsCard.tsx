"use client";

import { useState } from "react";

import {
  ACHIEVEMENT_GROUPS,
  type AchievementGroup,
  type AchievementState,
} from "@/features/profile/model/achievements";
import { TIER_COLOR, TIERS } from "@/features/profile/model/badges";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import Button from "@/shared/ui/Button/Button";
import Card from "@/shared/ui/Card/Card";
import FilterPills from "@/shared/ui/FilterPills/FilterPills";
import Icon from "@/shared/ui/Icon/Icon";
import OptionPicker from "@/shared/ui/OptionPicker/OptionPicker";
import ProgressMeter from "@/shared/ui/ProgressMeter/ProgressMeter";

import AchievementTile from "./AchievementTile";
import TierMedal from "./TierMedal";

import styles from "./AchievementsCard.module.scss";

type AchievementView = "all" | "unlocked" | "locked";

// The achievements shown before the list is expanded
const PREVIEW = 12;

// Unlocked ones first by tier, then the closest to unlocking
const byStanding = (a: AchievementState, b: AchievementState) =>
  Number(b.unlocked) - Number(a.unlocked) ||
  (a.unlocked ? TIERS.indexOf(b.tier) - TIERS.indexOf(a.tier) : b.progress - a.progress);

// Whether a picked value names a group of achievements
const isGroup = (value: string): value is AchievementGroup => (ACHIEVEMENT_GROUPS as readonly string[]).includes(value);

// Whether an achievement fits the chosen view
const inView = (achievement: AchievementState, view: AchievementView) => {
  if (view === "unlocked") return achievement.unlocked;
  return view === "locked" ? !achievement.unlocked : true;
};

interface AchievementsCardProps {
  achievements: AchievementState[];
}

// Every achievement by tier, the closest to unlocking and filters for the rest
const AchievementsCard = ({ achievements }: AchievementsCardProps) => {
  const { t, tk } = useI18n();
  const [view, setView] = useState<AchievementView>("all");
  const [group, setGroup] = useState<AchievementGroup | "all">("all");
  const [expanded, setExpanded] = useState(false);
  const unlocked = achievements.filter((a) => a.unlocked);
  const inGroup = achievements.filter((a) => group === "all" || a.group === group);
  const visible = inGroup.filter((a) => inView(a, view)).toSorted(byStanding);
  const nextUp = achievements
    .filter((a) => !a.unlocked && a.progress > 0)
    .toSorted((a, b) => b.progress - a.progress)
    .slice(0, 3);

  return (
    <Card
      title={t("profile.ach.title")}
      subtitle={t("profile.ach.count", { n: unlocked.length, total: achievements.length })}
      icon="trophy"
    >
      <div className={styles.tiers}>
        {TIERS.map((tier) => {
          const all = achievements.filter((a) => a.tier === tier);
          return (
            <div key={tier} className={styles.tierTile}>
              <p className={styles.tierName} style={{ "--tier": TIER_COLOR[tier] }}>
                <span aria-hidden className={styles.dot} />
                {t(`profile.ach.tier.${tier}`)}
              </p>
              <p className={styles.tierCount}>
                {all.filter((a) => a.unlocked).length}/{all.length}
              </p>
            </div>
          );
        })}
      </div>

      {nextUp.length > 0 && (
        <div className={styles.next}>
          <p className={styles.nextTitle}>{t("profile.ach.nextUp")}</p>
          <ul className={styles.nextList}>
            {nextUp.map((a) => {
              const title = tk(`ach.${a.id}.title`, a.id);
              return (
                <li key={a.id} className={styles.nextItem}>
                  <TierMedal tier={a.tier} icon={a.icon} unlocked={false} size={36} />
                  <span className={styles.nextBody}>
                    <span className={styles.nextName}>{title}</span>
                    <span className={styles.nextMeter}>
                      <ProgressMeter value={a.progress} max={1} label={title} />
                    </span>
                  </span>
                  <span className={styles.nextShare}>{Math.round(a.progress * 100)}%</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className={styles.filters}>
        <FilterPills<AchievementView>
          label={t("profile.ach.title")}
          options={[
            { value: "all", label: t("filter.all"), count: inGroup.length },
            {
              value: "unlocked",
              label: t("profile.ach.unlockedPlural"),
              count: inGroup.filter((a) => a.unlocked).length,
            },
            { value: "locked", label: t("profile.ach.locked"), count: inGroup.filter((a) => !a.unlocked).length },
          ]}
          value={view}
          onChange={setView}
        />
        <div className={styles.group}>
          <OptionPicker
            size="sm"
            label={t("profile.ach.groups")}
            value={group}
            onChange={(next) => setGroup(isGroup(next) ? next : "all")}
            groups={[
              {
                items: [
                  { value: "all", label: t("profile.ach.group.all") },
                  ...ACHIEVEMENT_GROUPS.map((id) => {
                    const ofGroup = achievements.filter((a) => a.group === id);
                    return {
                      value: id,
                      label: t(`profile.ach.group.${id}`),
                      hint: `${String(ofGroup.filter((a) => a.unlocked).length)}/${String(ofGroup.length)}`,
                    };
                  }),
                ],
              },
            ]}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className={styles.none}>{t("profile.ach.none")}</p>
      ) : (
        <>
          <ul className={styles.list}>
            {(expanded ? visible : visible.slice(0, PREVIEW)).map((a) => (
              <AchievementTile key={a.id} achievement={a} />
            ))}
          </ul>
          {visible.length > PREVIEW && (
            <div className={styles.more}>
              <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
                <Icon name="chevronDown" size={14} className={cx(expanded && styles.flipped)} />
                {expanded ? t("profile.ach.showLess") : t("profile.ach.showAll", { n: visible.length })}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default AchievementsCard;
