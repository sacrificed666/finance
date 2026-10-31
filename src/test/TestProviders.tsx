import { type ReactNode, useEffect, useMemo, useState } from "react";

import { type StoreApi, StoreContext, type SyncApi, SyncContext } from "@/app/store";
import type { AppState } from "@/features/data/model/types";
import I18nProvider from "@/shared/i18n/I18nProvider";
import { en } from "@/shared/i18n/messages/en";
import { uk } from "@/shared/i18n/messages/uk";

export type TestLocale = "en" | "uk";

// The translations of a language around the children
export const Translations = ({ locale, children }: { locale: TestLocale; children: ReactNode }) => (
  <I18nProvider locale={locale} messages={locale === "uk" ? uk : en}>
    {children}
  </I18nProvider>
);

interface TestStoreProps {
  initial: AppState;
  sync: Partial<SyncApi>;
  store: Partial<StoreApi>;
  onState: (state: AppState) => void;
  onUpdate: (label: string | undefined) => void;
  children: ReactNode;
}

// A store that keeps its state in React, without a server
export const TestStore = ({ initial, sync, store, onState, onUpdate, children }: TestStoreProps) => {
  const [state, setState] = useState(initial);
  // Tells the test about every new state
  useEffect(() => onState(state), [state, onState]);
  const api = useMemo<StoreApi>(
    () => ({
      state,
      hydrated: true,
      loadError: null,
      // Applies a change and reports the undo label it came with
      update: (change, label) => {
        onUpdate(label);
        setState(change);
      },
      // Applies a change the app made by itself
      quietUpdate: (change) => setState(change),
      // Replaces the whole state
      replace: (next) => setState(next),
      // Nothing to load in a test
      reload: () => Promise.resolve(),
      // Undo is not part of these tests
      undo: () => {},
      // Closing the toast changes nothing here
      dismissUndo: () => {},
      ...store,
    }),
    [state, store, onUpdate],
  );
  const status = useMemo<SyncApi>(() => ({ sync: "idle", undoLabel: null, restored: 0, ...sync }), [sync]);
  return (
    <StoreContext value={api}>
      <SyncContext value={status}>{children}</SyncContext>
    </StoreContext>
  );
};
