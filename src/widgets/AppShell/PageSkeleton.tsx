"use client";

import { PROFILE_SKELETON } from "@/features/profile/model/skeleton";
import { useI18n } from "@/shared/i18n/useI18n";
import { cx } from "@/shared/lib/cx";
import {
  blockCard,
  fieldsCard,
  rowsCard,
  splitCard,
  tilesCard,
  type SkeletonPageShape,
} from "@/shared/ui/Skeleton/shapes";
import SkeletonPage from "@/shared/ui/Skeleton/SkeletonPage";

import styles from "./AppShell.module.scss";

interface PageOutline {
  wideTitle?: boolean;
  date?: boolean;
  action?: "button" | "controls";
  body: SkeletonPageShape;
}

// Each page as it opens: header, hero, tiles and the columns of cards
const PAGES: Record<string, PageOutline> = {
  "/": {
    wideTitle: true,
    date: true,
    action: "controls",
    body: {
      tiles: 2,
      stacked: true,
      insights: true,
      main: [fieldsCard(2), blockCard(200, true), blockCard(240, true)],
      side: [rowsCard(2, true), rowsCard(5, true), splitCard(4)],
    },
  },
  "/calendar": {
    action: "button",
    body: { tiles: 4, main: [blockCard(420), blockCard(170)], side: [rowsCard(1, true), rowsCard(2), rowsCard(5)] },
  },
  "/reports": {
    action: "controls",
    body: {
      tiles: 4,
      main: [blockCard(264), rowsCard(7), tilesCard(6, 3, 6)],
      side: [blockCard(170), splitCard(2), splitCard(2), rowsCard(5)],
    },
  },
  "/transactions": {
    action: "button",
    body: {
      tiles: 4,
      main: [blockCard(240, true), rowsCard(6)],
      side: [rowsCard(3, true), rowsCard(5), rowsCard(2, true)],
    },
  },
  "/income": {
    action: "button",
    body: { tiles: 4, main: [blockCard(200)], side: [splitCard(2)], tail: rowsCard(6) },
  },
  "/accounts": {
    action: "button",
    body: {
      tiles: 4,
      main: [tilesCard(3, 3, 10, 1), rowsCard(1, true)],
      side: [splitCard(2), rowsCard(1), rowsCard(1, true)],
    },
  },
  "/investments": {
    action: "button",
    body: { tiles: 4, main: [tilesCard(6, 3, 3.5)], side: [rowsCard(2)] },
  },
  "/forecast": {
    action: "controls",
    body: {
      tiles: 4,
      main: [fieldsCard(3), blockCard(260)],
      side: [fieldsCard(1), rowsCard(1, true), rowsCard(1, true)],
      across: rowsCard(6),
    },
  },
  "/profile": { body: PROFILE_SKELETON },
  "/settings": {
    body: {
      sections: true,
      tiles: 4,
      main: [rowsCard(8, true), fieldsCard(2)],
      side: [fieldsCard(3), fieldsCard(1), rowsCard(3)],
    },
  },
};

// A page without an outline of its own opens like the expenses
const FALLBACK: PageOutline = { action: "button", body: { tiles: 4, main: [rowsCard(6)], side: [rowsCard(3)] } };

interface PageSkeletonProps {
  path: string;
}

// The page in outline while the account loads, so nothing jumps when it arrives
const PageSkeleton = ({ path }: PageSkeletonProps) => {
  const { t } = useI18n();
  const page = PAGES[path] ?? FALLBACK;
  return (
    <output className={styles.skeleton} aria-label={t("common.loading")} aria-busy="true">
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonTitles}>
          <span className={cx(styles.bone, styles.skeletonTitle, page.wideTitle && styles.skeletonTitleWide)} />
          {page.date && <span className={cx(styles.bone, styles.skeletonDate)} />}
        </div>
        {page.action === "button" && <span className={cx(styles.bone, styles.skeletonButton)} />}
        {page.action === "controls" && (
          <span className={styles.skeletonControls}>
            <span className={cx(styles.bone, styles.skeletonSegments)} />
            <span className={cx(styles.bone, styles.skeletonRound)} />
          </span>
        )}
      </div>
      <SkeletonPage shape={page.body} />
    </output>
  );
};

export default PageSkeleton;
