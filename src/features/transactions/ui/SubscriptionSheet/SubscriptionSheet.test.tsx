import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState, Subscription } from "@/features/data/model/types";
import { renderWithStore } from "@/test/render";

import SubscriptionSheet from "./SubscriptionSheet";

const music: Subscription = {
  id: "music",
  name: "Music",
  icon: "🎵",
  price: 99,
  currency: "UAH",
  period: "monthly",
  dayOfMonth: 3,
  startMonth: "2026-08",
  active: false,
};

describe("SubscriptionSheet", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-15T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts from a suggestion and saves it", async () => {
    const onClose = vi.fn<() => void>();
    const draft = { name: "Video", price: 300, currency: "UAH" as const, dayOfMonth: 9, startMonth: "2026-09" };
    const { user, probe } = renderWithStore(<SubscriptionSheet target="new" draft={draft} onClose={onClose} />);
    expect(screen.getByDisplayValue("Video")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.subscriptions).toEqual([expect.objectContaining({ name: "Video", price: 300, active: true })]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("explains a yearly price as monthly charges", async () => {
    const { user } = renderWithStore(<SubscriptionSheet target="new" onClose={vi.fn<() => void>()} />);
    await user.click(screen.getByRole("radio", { name: "Yearly" }));
    await user.type(screen.getByRole("textbox", { name: /^Price per year/u }), "1200");
    expect(screen.getByText("charged once a year, 100.00 ₴/mo on average")).toBeInTheDocument();
    expect(screen.getByText("Name the service.")).toBeInTheDocument();
  });

  it("resumes a paused subscription", async () => {
    const state: AppState = { ...DEFAULT_STATE, subscriptions: [music] };
    const { user, probe } = renderWithStore(<SubscriptionSheet target={music} onClose={vi.fn<() => void>()} />, {
      state,
    });
    await user.click(screen.getByRole("button", { name: "Resume" }));
    expect(probe.state.subscriptions[0]?.active).toBe(true);
    expect(probe.undoLabels).toContain("Subscription resumed");
  });

  it("edits every field and ends the subscription this month", async () => {
    const running: Subscription = { ...music, active: true };
    const state: AppState = {
      ...DEFAULT_STATE,
      subscriptions: [running],
      savings: [{ id: "card", name: "Card", icon: "💳", kind: "card", currency: "USD", openingBalance: 0 }],
    };
    const onClose = vi.fn<() => void>();
    const { user, probe } = renderWithStore(<SubscriptionSheet target={running} onClose={onClose} />, { state });
    const name = screen.getByDisplayValue("Music");
    await user.clear(name);
    await user.type(name, "Radio");
    await user.click(screen.getByRole("button", { name: "Icon" }));
    await user.click(screen.getByRole("radio", { name: "🎬" }));
    await user.click(screen.getByRole("radio", { name: /USD/u }));
    await user.click(screen.getByRole("combobox", { name: /^Account/u }));
    await user.click(screen.getByRole("option", { name: /Card/u }));
    const day = screen.getByLabelText(/^Charge day/u);
    await user.clear(day);
    await user.type(day, "12");
    await user.click(screen.getByRole("button", { name: /^End with/u }));
    expect(screen.queryByRole("button", { name: /^End with/u })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(probe.state.subscriptions[0]).toMatchObject({
      name: "Radio",
      icon: "🎬",
      currency: "USD",
      accountId: "card",
      dayOfMonth: 12,
      endMonth: "2026-10",
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("deletes a subscription with its charges once confirmed", async () => {
    const charge = {
      id: "c1",
      type: "expense" as const,
      amount: 99,
      currency: "UAH" as const,
      categoryId: "cat-subscriptions",
      date: "2026-09-03",
      subscriptionId: "music",
    };
    const state: AppState = { ...DEFAULT_STATE, subscriptions: [music], transactions: [charge] };
    const onClose = vi.fn<() => void>();
    const { user, probe } = renderWithStore(<SubscriptionSheet target={music} onClose={onClose} />, { state });
    await user.click(screen.getByRole("button", { name: "Delete" }));
    const confirm = screen.getByRole("dialog", { name: "Delete this subscription?" });
    expect(confirm).toHaveTextContent("the 1 charge it posted");
    await user.click(within(confirm).getByRole("button", { name: "Cancel" }));
    expect(probe.state.subscriptions).toHaveLength(1);
    vi.setSystemTime(Date.now() + 500);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(
      within(screen.getByRole("dialog", { name: "Delete this subscription?" })).getByRole("button", { name: "Delete" }),
    );
    expect(probe.state.subscriptions).toEqual([]);
    expect(probe.state.transactions).toEqual([]);
    expect(probe.undoLabels).toContain("Subscription deleted");
    expect(onClose).toHaveBeenCalledOnce();
  });
});
