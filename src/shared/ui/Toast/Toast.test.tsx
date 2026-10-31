import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithI18n } from "@/test/render";

import Toast from "./Toast";

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("announces the message, runs the action and closes", () => {
    const onAction = vi.fn<() => void>();
    const onDismiss = vi.fn<() => void>();
    renderWithI18n(<Toast message="Entry deleted" actionLabel="Undo" onAction={onAction} onDismiss={onDismiss} />);
    expect(screen.getByRole("status")).toHaveTextContent("Entry deleted");
    act(() => screen.getByRole("button", { name: "Undo" }).click());
    expect(onAction).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("closes by itself after the timeout or on the close button", () => {
    const onDismiss = vi.fn<() => void>();
    renderWithI18n(
      <Toast
        message="Saved"
        actionLabel="Undo"
        onAction={vi.fn<() => void>()}
        onDismiss={onDismiss}
        timeoutMs={1000}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onDismiss).toHaveBeenCalledOnce();
    act(() => screen.getByRole("button", { name: "Dismiss" }).click());
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it("stays until acted on when it cannot be dismissed", () => {
    const onAction = vi.fn<() => void>();
    renderWithI18n(<Toast message="Restored" actionLabel="Undo" onAction={onAction} />);
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument();
    act(() => screen.getByRole("button", { name: "Undo" }).click());
    expect(onAction).toHaveBeenCalledOnce();
  });
});
