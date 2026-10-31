"use client";

import type { gamification } from "@/features/profile/model/achievements";
import { ageFrom, type Profile } from "@/features/profile/model/profileFields";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatDate } from "@/shared/lib/date";
import { formatNumber } from "@/shared/lib/money";
import Button from "@/shared/ui/Button/Button";
import ExternalLink from "@/shared/ui/ExternalLink/ExternalLink";
import Icon from "@/shared/ui/Icon/Icon";
import PageHero, { type HeroStat } from "@/shared/ui/PageHero/PageHero";

import Avatar from "./Avatar";
import LevelSummary from "./LevelSummary";

import styles from "./ProfileHero.module.scss";

interface ProfileHeroProps {
  profile: Profile;
  g: ReturnType<typeof gamification>;
  onEdit: () => void;
}

// The part of an address before the @, as a name until one is set
const nameFromEmail = (email: string) => {
  const local = email.split("@")[0] ?? "";
  return local.charAt(0).toUpperCase() + local.slice(1);
};

// The profile's headline: who it is, the level and the habits behind it
const ProfileHero = ({ profile, g, onEdit }: ProfileHeroProps) => {
  const { t, tp } = useI18n();
  const name = profile.name?.trim() ? profile.name : nameFromEmail(profile.email ?? "");
  const facts = [
    profile.occupation,
    profile.location,
    profile.birthday ? t("profile.age", { n: ageFrom(profile.birthday) }) : null,
    t("profile.memberSince", { date: formatDate(profile.createdAt) }),
  ].filter((fact) => fact !== null && fact !== "");

  const stats: HeroStat[] = [
    {
      label: t("profile.stats.logged"),
      icon: "edit",
      value: formatNumber(g.facts.manualTransactions, 0),
      hint: t("profile.stats.loggedMonth", { n: g.facts.manualThisMonth }),
    },
    {
      label: t("profile.stats.activeDays"),
      icon: "sparkle",
      value: `${String(g.facts.activeDays30)}/30`,
      hint: t("profile.stats.activeDays.sub"),
    },
    {
      label: t("profile.stats.weekStreak"),
      icon: "flame",
      value: tp("profile.stats.weeksValue", g.facts.weekStreak),
      hint: t("profile.stats.best", { value: tp("profile.stats.weeksValue", g.facts.bestWeekStreak) }),
    },
    {
      label: t("profile.stats.streak"),
      icon: "trend",
      value: tp("profile.stats.monthsValue", g.facts.positiveStreak),
      hint: t("profile.stats.best", { value: tp("profile.stats.monthsValue", g.facts.bestStreak) }),
    },
  ];

  return (
    <PageHero
      icon="user"
      label={t("nav.account")}
      lead={
        <div className={styles.lead}>
          <Avatar name={profile.name ?? ""} email={profile.email ?? ""} image={profile.image ?? ""} />
          <div className={styles.who}>
            <p className={styles.name}>{name}</p>
            <p className={styles.email}>{profile.email}</p>
            <p className={styles.facts}>
              {facts.map((fact, index) => (
                <span key={fact} className={styles.fact}>
                  {fact}
                  {index < facts.length - 1 && <span aria-hidden>·</span>}
                </span>
              ))}
              {profile.website && (
                <ExternalLink href={profile.website} icon={false} className={styles.website}>
                  <Icon name="globe" size={12} />
                  {profile.website.replace(/^https:\/\//u, "")}
                </ExternalLink>
              )}
            </p>
            {profile.about && <p className={styles.about}>{profile.about}</p>}
          </div>
        </div>
      }
      action={
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Icon name="edit" size={14} />
          {t("profile.edit")}
        </Button>
      }
      aside={<LevelSummary g={g} />}
      stats={stats}
    />
  );
};

export default ProfileHero;
