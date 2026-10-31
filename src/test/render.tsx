import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";

import type { StoreApi, SyncApi } from "@/app/store";
import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";

import { TestStore, Translations, type TestLocale } from "./TestProviders";

// Renders a component inside the translations of a language
export const renderWithI18n = (ui: ReactElement, locale: TestLocale = "en") => {
  // The translations around the element
  const wrapper = ({ children }: { children: ReactNode }) => <Translations locale={locale}>{children}</Translations>;
  return { user: userEvent.setup(), ...render(ui, { wrapper }) };
};

interface StoreOptions {
  state?: AppState;
  locale?: TestLocale;
  sync?: Partial<SyncApi>;
  store?: Partial<StoreApi>;
}

// What the store went through, for the assertions of a test
export interface StoreProbe {
  state: AppState;
  undoLabels: (string | undefined)[];
}

// Renders a component with the account's data and the translations
export const renderWithStore = (ui: ReactElement, options: StoreOptions = {}) => {
  const initial = options.state ?? DEFAULT_STATE;
  const probe: StoreProbe = { state: initial, undoLabels: [] };
  // Keeps the latest state for the test
  const onState = (state: AppState) => {
    probe.state = state;
  };
  // Keeps the undo label of every change
  const onUpdate = (label: string | undefined) => {
    probe.undoLabels.push(label);
  };
  const sync = options.sync ?? {};
  const store = options.store ?? {};
  // The store and the translations around the element
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Translations locale={options.locale ?? "en"}>
      <TestStore initial={initial} sync={sync} store={store} onState={onState} onUpdate={onUpdate}>
        {children}
      </TestStore>
    </Translations>
  );
  return { user: userEvent.setup(), probe, ...render(ui, { wrapper }) };
};
