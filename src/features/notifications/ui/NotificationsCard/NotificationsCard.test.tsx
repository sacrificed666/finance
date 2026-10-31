import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { pushSetup, sendTest, subscribe, unsubscribe } from "@/features/notifications/api/subscription";
import { renderWithStore } from "@/test/render";

import NotificationsCard from "./NotificationsCard";

const requests = vi.hoisted(() => ({
  pushSetup: vi.fn<typeof pushSetup>(),
  subscribe: vi.fn<typeof subscribe>(),
  unsubscribe: vi.fn<typeof unsubscribe>(),
  sendTest: vi.fn<typeof sendTest>(),
}));

vi.mock(import("@/features/notifications/api/subscription"), async (importOriginal) => ({
  ...(await importOriginal()),
  ...requests,
}));

describe("NotificationsCard", () => {
  it("says why notifications cannot work here", async () => {
    requests.pushSetup.mockResolvedValue({ status: "unsupported", key: null, hour: 9 });
    renderWithStore(<NotificationsCard />);
    expect(await screen.findByText(/browser/iu)).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("turns notifications on, picks the kinds and sends a test", async () => {
    requests.pushSetup.mockResolvedValue({ status: "off", key: new Uint8Array([1]), hour: 8 });
    requests.subscribe.mockResolvedValue("on");
    requests.sendTest.mockResolvedValue("wait");
    const { user, probe } = renderWithStore(<NotificationsCard />);
    await user.click(await screen.findByRole("switch", { name: "Reminders on this device" }));
    expect(requests.subscribe).toHaveBeenCalledOnce();
    const [, budgets] = screen.getAllByRole("switch").slice(1);
    if (budgets) await user.click(budgets);
    expect(probe.state.settings.notify).toMatchObject({ budgets: false });
    await user.click(screen.getByRole("button", { name: /test/iu }));
    expect(await screen.findByText(/minute|wait/iu)).toBeInTheDocument();
  });
});
