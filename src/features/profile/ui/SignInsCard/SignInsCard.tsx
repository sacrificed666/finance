"use client";

import { useEffect, useState } from "react";

import { fetchSignIns, type SignInMethod, type SignIns } from "@/features/profile/api/profile";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { formatDateShort, formatTime, pad, todayISO } from "@/shared/lib/date";
import Badge from "@/shared/ui/Badge/Badge";
import Button from "@/shared/ui/Button/Button";
import Card from "@/shared/ui/Card/Card";
import Icon from "@/shared/ui/Icon/Icon";
import type { IconName } from "@/shared/ui/Icon/icons";
import IconDisc from "@/shared/ui/IconDisc/IconDisc";
import SkeletonRows from "@/shared/ui/Skeleton/SkeletonRows";

import styles from "./SignInsCard.module.scss";

// The icon of each way of signing in
const METHOD_ICON: Record<SignInMethod, IconName> = { password: "lock", google: "globe", passkey: "key" };

// When a sign-in happened: the time today, or the day and time before
const whenOf = (iso: string, today: string) => {
  const at = new Date(iso);
  const day = `${String(at.getFullYear())}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
  return day === today ? formatTime(iso) : `${formatDateShort(day)}, ${formatTime(iso)}`;
};

// How many sign-ins show before the rest is asked for
const FIRST = 5;

// The account's recent sign-ins, this device marked, the latest few at first
const SignInsCard = () => {
  const { t } = useI18n();
  const [data, setData] = useState<SignIns | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [all, setAll] = useState(false);

  // Loads the sign-ins once, unless the card goes away first
  useEffect(() => {
    let alive = true;
    void fetchSignIns().then((answer) => {
      if (!alive) return;
      setData(answer);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!loaded) {
    return (
      <Card title={t("profile.signins.title")} subtitle={t("profile.signins.subtitle")} icon="monitor">
        <output className={styles.loading} aria-label={t("common.loading")} aria-busy="true">
          <SkeletonRows count={3} />
        </output>
      </Card>
    );
  }
  if (!data || data.entries.length === 0) return null;
  const today = todayISO();
  return (
    <Card title={t("profile.signins.title")} subtitle={t("profile.signins.subtitle")} icon="monitor">
      <ul className={styles.rows}>
        {(all ? data.entries : data.entries.slice(0, FIRST)).map((entry) => (
          <li key={entry.id} className={styles.row}>
            <IconDisc colorSlot={5} size="md">
              <Icon name={METHOD_ICON[entry.method]} size={15} />
            </IconDisc>
            <span className={styles.text}>
              <span className={styles.device}>{entry.device || t("profile.signins.unknown")}</span>
              <span className={styles.how}>
                {[t(`profile.signins.method.${entry.method}`), entry.ip].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span className={styles.side}>
              <span className={styles.when}>{whenOf(entry.at, today)}</span>
              {entry.id === data.current && <Badge tone="income">{t("profile.signins.thisDevice")}</Badge>}
            </span>
          </li>
        ))}
      </ul>
      {data.entries.length > FIRST && (
        <div className={styles.more}>
          <Button variant="ghost" size="sm" onClick={() => setAll(!all)}>
            <Icon name="chevronDown" size={14} className={cx(all && styles.flipped)} />
            {all ? t("profile.ach.showLess") : t("profile.ach.showAll", { n: data.entries.length })}
          </Button>
        </div>
      )}
    </Card>
  );
};

export default SignInsCard;
