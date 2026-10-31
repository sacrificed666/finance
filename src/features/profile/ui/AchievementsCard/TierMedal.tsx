import type { Tier } from "@/features/profile/model/achievements";
import { TIER_COLOR } from "@/features/profile/model/badges";
import { cx } from "@/shared/lib/cx";

import styles from "./AchievementsCard.module.scss";

interface TierMedalProps {
  tier: Tier;
  icon: string;
  unlocked: boolean;
  size?: number;
}

// An achievement's emoji on a medal of its tier's colour, grey while locked
const TierMedal = ({ tier, icon, unlocked, size = 48 }: TierMedalProps) => (
  <span
    aria-hidden
    className={cx(styles.medal, !unlocked && styles.grey)}
    style={{
      width: size,
      height: size,
      fontSize: size * 0.48,
      background: `color-mix(in oklab, ${TIER_COLOR[tier]} ${unlocked ? "22" : "8"}%, transparent)`,
      boxShadow: `inset 0 0 0 2px color-mix(in oklab, ${TIER_COLOR[tier]} ${unlocked ? "75" : "22"}%, transparent)`,
    }}
  >
    {icon}
  </span>
);

export default TierMedal;
