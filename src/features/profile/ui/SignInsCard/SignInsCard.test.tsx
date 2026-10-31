import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { fetchSignIns } from "@/features/profile/api/profile";
import { renderWithI18n } from "@/test/render";

import SignInsCard from "./SignInsCard";

const load = vi.hoisted(() => vi.fn<typeof fetchSignIns>());

vi.mock(import("@/features/profile/api/profile"), async (importOriginal) => ({
  ...(await importOriginal()),
  fetchSignIns: load,
}));

describe("SignInsCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists the sign-ins and marks this device", async () => {
    load.mockResolvedValue({
      current: "s1",
      entries: [
        { id: "s1", at: "2026-10-10T08:00:00", method: "passkey", device: "Mac", ip: "1.2.3.4" },
        { id: "s2", at: "2026-10-01T08:00:00", method: "password", device: "", ip: "" },
      ],
    });
    renderWithI18n(<SignInsCard />);
    expect(await screen.findByText("Mac")).toBeInTheDocument();
    expect(screen.getByText("This device")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("shows the latest five and the rest on request", async () => {
    load.mockResolvedValue({
      current: "s0",
      entries: Array.from({ length: 7 }, (_, index) => ({
        id: `s${String(index)}`,
        at: "2026-10-09T08:00:00",
        method: "password" as const,
        device: `Device ${String(index)}`,
        ip: "",
      })),
    });
    renderWithI18n(<SignInsCard />);
    expect(await screen.findByText("Device 4")).toBeInTheDocument();
    expect(screen.queryByText("Device 5")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show all 7" }));
    expect(screen.getByText("Device 6")).toBeInTheDocument();
    vi.setSystemTime(new Date("2026-10-10T12:00:01"));
    fireEvent.click(screen.getByRole("button", { name: "Show less" }));
    expect(screen.queryByText("Device 6")).not.toBeInTheDocument();
  });

  it("outlines its rows while loading and shows nothing without sign-ins", async () => {
    load.mockResolvedValue(null);
    const { container } = renderWithI18n(<SignInsCard />);
    expect(screen.getByRole("status", { name: "Loading…" })).toHaveAttribute("aria-busy", "true");
    await vi.waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(load).toHaveBeenCalledOnce();
  });
});
