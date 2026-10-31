"use client";

import { usePathname } from "next/navigation";
import { Fragment, type ReactNode, useEffect, ViewTransition } from "react";

import { useStore, useSyncStatus } from "@/app/hooks";
import { useShortcuts } from "@/features/commands/model/useShortcuts";
import CommandPalette from "@/features/commands/ui/CommandPalette/CommandPalette";
import { useSnapshotRecorder } from "@/features/dashboard/model/useSnapshotRecorder";
import { useAutoRefresh } from "@/features/market/model/useAutoRefresh";
import { useHiddenAmounts } from "@/features/settings/model/hiddenAmounts";
import { usePrintTheme } from "@/features/settings/model/usePrintTheme";
import { useI18n } from "@/shared/i18n/useI18n";
import { setAmountsHidden } from "@/shared/lib/money";
import { pageItem } from "@/shared/lib/navigation";
import Toast from "@/shared/ui/Toast/Toast";
import Footer from "@/widgets/Footer/Footer";
import NavBar from "@/widgets/NavBar/NavBar";
import TabBar from "@/widgets/TabBar/TabBar";
import TopBar from "@/widgets/TopBar/TopBar";

import DatabaseError from "./DatabaseError";
import PageSkeleton from "./PageSkeleton";

import styles from "./AppShell.module.scss";

interface AppShellProps {
  children: ReactNode;
}

// The signed-in frame: the top bar or phone bars, the footer, palette and toast
const AppShell = ({ children }: AppShellProps) => {
  const { hydrated, loadError, reload, undo, dismissUndo } = useStore();
  const { undoLabel, restored } = useSyncStatus();
  const { t, tp, locale } = useI18n();
  const pathname = usePathname();
  const toast = restored > 0 ? tp("sync.restored", restored) : undoLabel;
  const hidden = useHiddenAmounts();
  // Every amount below formats as dots while the device hides them
  setAmountsHidden(hidden);
  useAutoRefresh();
  usePrintTheme();
  useSnapshotRecorder();
  useShortcuts();

  // Names the open page on the root, so the backdrop glows in its colour
  useEffect(() => {
    document.documentElement.dataset.page = pageItem(pathname)?.tone ?? "dashboard";
  }, [pathname]);

  // Marks the app entered after its first animations, so later pages skip them
  useEffect(() => {
    if (!hydrated) return;
    const id = setTimeout(() => {
      document.documentElement.dataset.entered = "";
    }, 1300);
    return () => clearTimeout(id);
  }, [hydrated]);

  let page = children;
  if (!hydrated) page = <PageSkeleton path={pathname} />;
  else if (loadError) page = <DatabaseError message={loadError} onRetry={() => void reload()} />;

  // A new key draws the frame again, so no figure keeps its old text or language
  return (
    <Fragment key={`${locale}:${hidden ? "hidden" : "shown"}`}>
      <a href="#main" className={styles.skip}>
        {t("app.skip")}
      </a>
      <CommandPalette />
      <div className={styles.frame}>
        <div className={styles.column}>
          <NavBar />
          <TopBar />
          <main id="main" tabIndex={-1} className={styles.main}>
            <ViewTransition key={pathname} enter="page-in" exit="page-out" default="none">
              <div className={styles.page}>{page}</div>
            </ViewTransition>
          </main>
          <Footer />
        </div>
      </div>
      <TabBar />
      {toast && (
        <Toast key={toast} message={toast} actionLabel={t("common.undo")} onAction={undo} onDismiss={dismissUndo} />
      )}
    </Fragment>
  );
};

export default AppShell;
