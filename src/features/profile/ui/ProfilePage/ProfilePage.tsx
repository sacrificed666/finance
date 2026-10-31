"use client";

import { useEffect, useState } from "react";

import { useStore } from "@/app/hooks";
import { fetchProfile } from "@/features/profile/api/profile";
import { gamification } from "@/features/profile/model/achievements";
import type { Profile } from "@/features/profile/model/profileFields";
import { PROFILE_SKELETON } from "@/features/profile/model/skeleton";
import AchievementsCard from "@/features/profile/ui/AchievementsCard/AchievementsCard";
import DetailsSheet from "@/features/profile/ui/DetailsSheet/DetailsSheet";
import HealthCard from "@/features/profile/ui/HealthCard/HealthCard";
import ProfileHero from "@/features/profile/ui/ProfileHero/ProfileHero";
import SignInCard from "@/features/profile/ui/SignInCard/SignInCard";
import SignInsCard from "@/features/profile/ui/SignInsCard/SignInsCard";
import StatsCard from "@/features/profile/ui/StatsCard/StatsCard";
import { useI18n } from "@/shared/i18n/useI18n";
import Card from "@/shared/ui/Card/Card";
import PageBody from "@/shared/ui/PageBody/PageBody";
import PageHeader from "@/shared/ui/PageHeader/PageHeader";
import SkeletonPage from "@/shared/ui/Skeleton/SkeletonPage";
import Split from "@/shared/ui/Split/Split";

import styles from "./ProfilePage.module.scss";

// The profile page: who the account is, its progress, health and sign-in
const ProfilePage = () => {
  const { state } = useStore();
  const { t } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(false);

  // Loads the profile once, unless the page goes away first
  useEffect(() => {
    let alive = true;
    void fetchProfile().then((loaded) => {
      if (!alive) return;
      if (loaded) setProfile(loaded);
      else setFailed(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const header = <PageHeader title={t("nav.profile")} />;
  if (failed) {
    return (
      <>
        {header}
        <Card>
          <p className={styles.status}>{t("profile.loadFailed")}</p>
        </Card>
      </>
    );
  }
  if (!profile) {
    return (
      <>
        {header}
        <output className={styles.loading} aria-label={t("common.loading")} aria-busy="true">
          <SkeletonPage shape={PROFILE_SKELETON} />
        </output>
      </>
    );
  }

  const g = gamification(state);
  return (
    <>
      {header}
      <PageBody>
        <ProfileHero profile={profile} g={g} onEdit={() => setEditing(true)} />
        <Split
          main={
            <>
              <AchievementsCard achievements={g.achievements} />
              <StatsCard facts={g.facts} />
            </>
          }
          side={
            <>
              <HealthCard health={g.health} facts={g.facts} />
              <SignInCard
                profile={profile}
                onChange={(patch) => setProfile((current) => (current ? { ...current, ...patch } : current))}
              />
            </>
          }
          tail={<SignInsCard />}
        />
      </PageBody>
      {editing && <DetailsSheet profile={profile} onSaved={setProfile} onClose={() => setEditing(false)} />}
    </>
  );
};

export default ProfilePage;
