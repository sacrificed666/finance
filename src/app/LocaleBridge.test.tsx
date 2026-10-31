import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StoreApi } from "@/app/store";
import { StoreContext } from "@/app/store";
import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { Messages } from "@/shared/i18n/catalog";
import type { Locale } from "@/shared/i18n/locales";
import { useI18n } from "@/shared/i18n/useI18n";

import LocaleBridge from "./LocaleBridge";

const catalog = vi.hoisted(() => ({
  cachedMessages: vi.fn<(locale: Locale) => Messages | undefined>(),
  loadMessages: vi.fn<(locale: Locale) => Promise<Messages>>(),
  rememberMessages: vi.fn<(locale: Locale, messages: Messages) => void>(),
}));

vi.mock("@/shared/i18n/catalog", () => catalog);

// Names the language the bridge hands down
const Shown = () => {
  const { locale, t } = useI18n();
  return (
    <p>
      {locale}: {t("app.name")}
    </p>
  );
};

// The store of an account that chose a language
const storeIn = (locale: Locale, extra: Partial<StoreApi> = {}): StoreApi => ({
  state: { ...DEFAULT_STATE, settings: { ...DEFAULT_STATE.settings, locale } },
  hydrated: true,
  loadError: null,
  update: () => {},
  quietUpdate: () => {},
  replace: () => {},
  reload: () => Promise.resolve(),
  undo: () => {},
  dismissUndo: () => {},
  ...extra,
});

// The bridge under a store, starting in English
const bridge = (store: StoreApi) => (
  <StoreContext value={store}>
    <LocaleBridge initialLocale="en" initialMessages={{ "app.name": "Finance" }}>
      <Shown />
    </LocaleBridge>
  </StoreContext>
);

describe("LocaleBridge", () => {
  beforeEach(() => {
    catalog.cachedMessages.mockReset();
    catalog.loadMessages.mockReset().mockResolvedValue({ "app.name": "Finanzen" });
  });

  it("keeps the server's language and remembers its texts", () => {
    render(bridge(storeIn("en")));
    expect(screen.getByText("en: Finance")).toBeInTheDocument();
    expect(catalog.rememberMessages).toHaveBeenCalledWith("en", { "app.name": "Finance" });
    expect(catalog.loadMessages).not.toHaveBeenCalled();
  });

  it("loads the account's language and switches once its texts are in", async () => {
    render(bridge(storeIn("de")));
    expect(screen.getByText("en: Finance")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("de: Finanzen")).toBeInTheDocument());
  });

  it("switches at once to a language loaded before", () => {
    catalog.cachedMessages.mockReturnValue({ "app.name": "Фінанси" });
    render(bridge(storeIn("uk")));
    expect(screen.getByText("uk: Фінанси")).toBeInTheDocument();
  });

  it("keeps the current language when the texts do not load", async () => {
    catalog.loadMessages.mockRejectedValue(new Error("offline"));
    render(bridge(storeIn("fr")));
    await waitFor(() => expect(catalog.loadMessages).toHaveBeenCalledWith("fr"));
    expect(screen.getByText("en: Finance")).toBeInTheDocument();
  });

  it("waits for the account before leaving the server's language", () => {
    render(bridge(storeIn("de", { hydrated: false })));
    render(bridge(storeIn("de", { loadError: "db down" })));
    expect(screen.getAllByText("en: Finance")).toHaveLength(2);
    expect(catalog.loadMessages).not.toHaveBeenCalled();
  });

  it("ignores texts that arrive after the language changed again", async () => {
    const slow = Promise.withResolvers<Messages>();
    catalog.loadMessages.mockReturnValueOnce(slow.promise);
    const view = render(bridge(storeIn("it")));
    catalog.cachedMessages.mockReturnValue({ "app.name": "Finance NL" });
    view.rerender(bridge(storeIn("nl")));
    slow.resolve({ "app.name": "Finanze" });
    await waitFor(() => expect(screen.getByText("nl: Finance NL")).toBeInTheDocument());
  });
});
