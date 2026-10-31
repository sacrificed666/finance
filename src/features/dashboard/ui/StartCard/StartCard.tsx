"use client";

import Link from "next/link";

import { useStore } from "@/app/hooks";
import { dashboardLayout, normalizeDashboard, showCard } from "@/features/dashboard/model/layout";
import { startSteps } from "@/features/dashboard/model/start";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import { pageItem } from "@/shared/lib/navigation";
import Card from "@/shared/ui/Card/Card";
import Icon from "@/shared/ui/Icon/Icon";
import ToneMark from "@/shared/ui/ToneMark/ToneMark";

import styles from "./StartCard.module.scss";

interface StartCardProps {
  alone?: boolean;
}

// The first steps with the app, ticked off as they are done; alone, it stays
const StartCard = ({ alone = false }: StartCardProps) => {
  const { state, update } = useStore();
  const { t } = useI18n();
  const steps = startSteps(state);
  const done = steps.filter((step) => step.done).length;
  if (done === steps.length) return null;

  // Puts the card away; the overview's layout settings can bring it back
  const hide = () =>
    update((s) => {
      const layout = showCard(dashboardLayout(s.settings.dashboard), "start", false);
      return { ...s, settings: { ...s.settings, dashboard: normalizeDashboard(layout) } };
    });

  return (
    <Card
      glow
      icon="sparkle"
      title={t("dash.start")}
      subtitle={t("dash.start.progress", { done, total: steps.length })}
      action={
        !alone && (
          <button type="button" aria-label={t("common.dismiss")} onClick={hide} className={styles.hide}>
            <Icon name="close" size={15} />
          </button>
        )
      }
    >
      <p className={styles.hint}>{t("dash.empty.hint")}</p>
      <ol className={styles.steps}>
        {steps.map((step, index) => {
          const page = pageItem(step.href);
          return (
            <li key={step.id}>
              <Link
                href={step.href}
                className={cx(styles.step, step.done && styles.done)}
                style={{ "--tint": `var(--tone-${page?.tone ?? "dashboard"})` }}
              >
                <span className={styles.top}>
                  {page && <ToneMark icon={page.icon} tone={page.tone} size="lg" />}
                  <span aria-hidden className={styles.number}>
                    {index + 1}
                  </span>
                </span>
                <span className={styles.body}>
                  <span className={styles.title}>{t(step.title)}</span>
                  <span className={styles.meta}>{t(step.hint)}</span>
                </span>
                {step.done ? (
                  <span className={styles.tick}>
                    <Icon name="check" size={14} strokeWidth={3} />
                    <span className={styles.hidden}>{t("dash.start.done")}</span>
                  </span>
                ) : (
                  <Icon name="arrowRight" size={18} strokeWidth={2.2} className={styles.arrow} />
                )}
              </Link>
            </li>
          );
        })}
      </ol>
      <Link href="/settings" className={styles.import}>
        {t("dash.start.import")}
        <Icon name="arrowRight" size={13} strokeWidth={2.4} />
      </Link>
    </Card>
  );
};

export default StartCard;
