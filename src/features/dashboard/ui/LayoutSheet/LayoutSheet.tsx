"use client";

import { DEFAULT_DASHBOARD, isDefaultDashboard, withoutCards } from "@/features/dashboard/model/layout";
import type { DashboardCardId, DashboardLayout } from "@/features/data/model/types";
import { useI18n } from "@/shared/i18n/useI18n";
import Button from "@/shared/ui/Button/Button";
import Sheet from "@/shared/ui/Sheet/Sheet";

import LayoutColumn from "./LayoutColumn";

import styles from "./LayoutSheet.module.scss";

interface LayoutSheetProps {
  layout: DashboardLayout;
  retired?: readonly DashboardCardId[];
  onChange: (next: DashboardLayout) => void;
  onClose: () => void;
}

// No card is retired from the settings
const NONE: readonly DashboardCardId[] = [];

// Orders the dashboard's cards in their two columns and hides the unwanted ones
const LayoutSheet = ({ layout, retired = NONE, onChange, onClose }: LayoutSheetProps) => {
  const { t } = useI18n();
  const offered = withoutCards(layout, retired);
  return (
    <Sheet
      open
      onClose={onClose}
      title={t("dash.layout.title")}
      footer={
        <>
          <Button variant="ghost" disabled={isDefaultDashboard(layout)} onClick={() => onChange(DEFAULT_DASHBOARD)}>
            {t("dash.layout.reset")}
          </Button>
          <Button onClick={onClose}>{t("dash.layout.done")}</Button>
        </>
      }
    >
      <p className={styles.hint}>{t("dash.layout.hint")}</p>
      <LayoutColumn title={t("dash.layout.main")} ids={offered.main} layout={offered} onChange={onChange} />
      <LayoutColumn title={t("dash.layout.side")} ids={offered.side} layout={offered} onChange={onChange} />
    </Sheet>
  );
};

export default LayoutSheet;
