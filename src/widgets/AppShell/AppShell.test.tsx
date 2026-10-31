import { act, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithStore } from "@/test/render";

import AppShell from "./AppShell";

const nav = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn<(href: string) => void>() }),
  usePathname: () => nav.pathname,
}));
vi.mock("next-auth/react", () => ({ signOut: () => Promise.resolve() }));
vi.mock("@/features/data/model/outbox", () => ({ clearOutbox: () => Promise.resolve() }));
vi.mock("@/features/market/model/useAutoRefresh", () => ({ useAutoRefresh: () => {} }));
vi.mock("@/features/settings/model/usePrintTheme", () => ({ usePrintTheme: () => {} }));
vi.mock("@/features/dashboard/model/useSnapshotRecorder", () => ({ useSnapshotRecorder: () => {} }));

describe("AppShell", () => {
  afterEach(() => {
    vi.useRealTimers();
    nav.pathname = "/";
    delete document.documentElement.dataset.entered;
  });

  it("frames the page and marks the app entered after its first animations", () => {
    vi.useFakeTimers();
    renderWithStore(
      <AppShell>
        <h1>Reports</h1>
      </AppShell>,
    );
    expect(screen.getByRole("main")).toContainElement(screen.getByRole("heading", { name: "Reports" }));
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(document.documentElement.dataset.entered).toBeUndefined();
    act(() => {
      vi.advanceTimersByTime(1300);
    });
    expect(document.documentElement.dataset.entered).toBe("");
  });

  it("shows the page in outline while the account loads", () => {
    nav.pathname = "/reports";
    const { container } = renderWithStore(<AppShell>page</AppShell>, { store: { hydrated: false } });
    expect(screen.getByRole("status", { name: "Loading…" })).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("page")).not.toBeInTheDocument();
    expect(container.querySelectorAll("[class*='statTiles'] > *")).toHaveLength(4);
    expect(container.querySelectorAll("[class*='insights']")).toHaveLength(0);
  });

  it("outlines the dashboard with its two tiles and insights, and any other page too", () => {
    const { container, unmount } = renderWithStore(<AppShell>page</AppShell>, { store: { hydrated: false } });
    expect(container.querySelectorAll("[class*='statTiles'] > *")).toHaveLength(2);
    expect(container.querySelectorAll("[class*='insights']")).toHaveLength(1);
    unmount();
    nav.pathname = "/somewhere";
    renderWithStore(<AppShell>page</AppShell>, { store: { hydrated: false } });
    expect(screen.getByRole("status", { name: "Loading…" })).toBeInTheDocument();
  });

  it("explains a database that cannot be reached and tries again", async () => {
    const reload = vi.fn<() => Promise<void>>(() => Promise.resolve());
    const { user } = renderWithStore(<AppShell>page</AppShell>, {
      store: { loadError: "connect ECONNREFUSED", reload },
    });
    expect(screen.getByRole("heading", { name: "Database unavailable" })).toBeInTheDocument();
    expect(screen.getByText("DATABASE_URL")).toBeInTheDocument();
    expect(screen.getByText("connect ECONNREFUSED")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(reload).toHaveBeenCalledOnce();
  });

  it("offers to undo the last change and names restored edits", async () => {
    const undo = vi.fn<() => void>();
    const { user, unmount } = renderWithStore(<AppShell>page</AppShell>, {
      sync: { undoLabel: "Entry deleted" },
      store: { undo },
    });
    expect(screen.getByText("Entry deleted")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(undo).toHaveBeenCalledOnce();
    unmount();
    renderWithStore(<AppShell>page</AppShell>, { sync: { undoLabel: "Ignored", restored: 2 } });
    expect(screen.getByText("Restored 2 changes that had not reached the server")).toBeInTheDocument();
  });
});
