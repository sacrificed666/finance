import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithStore } from "@/test/render";

import CalendarFeedCard from "./CalendarFeedCard";

describe("CalendarFeedCard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("makes a calendar link, shows it, renews it and turns it off", async () => {
    const fetchMock = vi.fn<(url: string) => Promise<Response>>((url) =>
      Promise.resolve(Response.json({ path: `/api/calendar/u1/token-${url.split("=")[1] ?? ""}.ics` })),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { user, probe } = renderWithStore(<CalendarFeedCard />);
    await user.click(screen.getByRole("button", { name: "Make a calendar link" }));
    expect(probe.state.settings.calendar).toEqual({ feed: 1, on: true });
    expect(await screen.findByDisplayValue(/\/api\/calendar\/u1\/token-1\.ics$/u)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open in Calendar" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^webcal:\/\/.+token-1\.ics$/u),
    );
    await user.click(screen.getByRole("button", { name: "New link" }));
    expect(probe.state.settings.calendar).toEqual({ feed: 2, on: true });
    expect(await screen.findByDisplayValue(/token-2\.ics$/u)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Turn off" }));
    expect(probe.state.settings.calendar).toEqual({ feed: 2, on: false });
    await user.click(screen.getByRole("button", { name: "Make a calendar link" }));
    expect(probe.state.settings.calendar).toEqual({ feed: 3, on: true });
  });
});
