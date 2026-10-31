"use client";

import Link from "next/link";

import type { FinanceFacts, HealthPart, HealthReport } from "@/features/profile/model/achievements";
import { HEALTH_LINK, HEALTH_TONE } from "@/features/profile/model/badges";
import { useI18n } from "@/shared/i18n/useI18n";
import { formatNumber, formatPercent } from "@/shared/lib/money";
import Card from "@/shared/ui/Card/Card";
import EmptyState from "@/shared/ui/EmptyState/EmptyState";
import Icon from "@/shared/ui/Icon/Icon";
import ProgressMeter from "@/shared/ui/ProgressMeter/ProgressMeter";

import ScoreRing from "./ScoreRing";

import styles from "./HealthCard.module.scss";

interface HealthCardProps {
  health: HealthReport;
  facts: FinanceFacts;
}

// The health score, its parts and what to work on first, once there is data
const HealthCard = ({ health, facts }: HealthCardProps) => {
  const { t } = useI18n();
  const tone = HEALTH_TONE[health.grade];

  // What a part of the score measured, in its own terms
  const partValue = (part: HealthPart): string => {
    switch (part.id) {
      case "savings":
        return formatPercent(part.value);
      case "cushion":
        return t("profile.health.months", { n: formatNumber(part.value, 1) });
      case "debt":
        return facts.debts === 0 ? t("profile.health.noDebt") : formatPercent(part.value, 0);
      case "budgets":
        return facts.budgetsTrackedLastMonth > 0
          ? `${String(facts.budgetsWithinLastMonth)}/${String(facts.budgetsTrackedLastMonth)}`
          : t("profile.health.noBudgets");
      case "stability":
        return `${String(facts.positiveMonths6)}/${String(facts.completeMonths6)}`;
      case "diversity":
        return formatNumber(part.value, 0);
      case "investing":
        return formatPercent(part.value, 0);
    }
  };

  if (!health.hasData) {
    return (
      <Card title={t("profile.health.title")} subtitle={t("profile.health.subtitle")} icon="heart">
        <EmptyState
          icon={<Icon name="heart" />}
          title={t("profile.health.empty")}
          hint={t("profile.health.empty.hint")}
        />
      </Card>
    );
  }

  return (
    <Card title={t("profile.health.title")} subtitle={t("profile.health.subtitle")} icon="heart">
      <div className={styles.head}>
        <ScoreRing score={health.score} tone={tone} />
        <div className={styles.grade}>
          <p className={styles.gradeName} style={{ color: tone }}>
            {t(`health.grade.${health.grade}`)}
          </p>
          <p className={styles.gradeHint}>{t(`health.grade.${health.grade}.hint`)}</p>
          {!health.enoughData && <p className={styles.few}>{t("profile.health.fewData")}</p>}
        </div>
      </div>
      <ul className={styles.parts}>
        {health.parts.map((part) => (
          <li key={part.id}>
            <div className={styles.partHead}>
              <span className={styles.partName}>{t(`health.part.${part.id}`)}</span>
              <span className={styles.partScore}>
                {partValue(part)} · <span className={styles.points}>{Math.round(part.score)}</span>/{part.max}
              </span>
            </div>
            <div className={styles.meter}>
              <ProgressMeter value={part.score} max={part.max} label={t(`health.part.${part.id}`)} />
            </div>
            <p className={styles.partHint}>{t(`health.part.${part.id}.hint`)}</p>
          </li>
        ))}
      </ul>
      {health.tips.length > 0 && (
        <div className={styles.tips}>
          <p className={styles.tipsTitle}>{t("profile.health.tips")}</p>
          {health.tips.map((id) => (
            <Link key={id} href={HEALTH_LINK[id]} className={styles.tip}>
              <Icon name="sparkle" size={16} className={styles.sparkle} />
              <span className={styles.tipText}>{t(`health.tip.${id}`)}</span>
              <Icon name="chevronRight" size={15} className={styles.chevron} />
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
};

export default HealthCard;
