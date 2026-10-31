import { beforeEach, describe, expect, it, vi } from "vitest";

import { feedToken } from "@/features/calendar/api/feedToken";
import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import { request } from "@/test/http";

const deps = vi.hoisted(() => ({
  loadState: vi.fn<(userId: string) => Promise<{ state: AppState; revision: string }>>(),
  logError: vi.fn<(where: string, error: unknown) => Promise<void>>(),
}));

vi.mock("@/features/data/api/repo", () => ({ loadState: deps.loadState }));
vi.mock("@/features/settings/api/errorLog", () => ({ logError: deps.logError }));

const { GET } = await import("./route");

const USER = "0b8c5b6e-1f2a-4c3d-9e8f-1234567890ab";

// The state of an account with its calendar link on or off
const stateWith = (on: boolean, feed = 3): AppState => ({
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_STATE.settings, locale: "en", calendar: { feed, on } },
  transactions: [
    {
      id: "rent",
      type: "expense",
      amount: 15000,
      currency: "UAH",
      categoryId: "cat-rent",
      date: "2099-01-05",
      note: "Rent",
    },
  ],
});

// The answer to a calendar file request
const ask = (user: string, token: string) =>
  GET(request(`/api/calendar/${user}/${token}`, "GET"), { params: Promise.resolve({ user, token }) });

describe("GET /api/calendar/[user]/[token]", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "secret");
    deps.loadState.mockResolvedValue({ state: stateWith(true), revision: "1" });
  });

  it("answers the current link with a calendar file", async () => {
    const response = await ask(USER, `3.${feedToken("secret", USER, 3)}.ics`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/calendar; charset=utf-8");
    expect(await response.text()).toContain("BEGIN:VCALENDAR");
  });

  it("turns a forged link away without reading the account", async () => {
    deps.loadState.mockClear();
    expect((await ask(USER, `3.${feedToken("other", USER, 3)}.ics`)).status).toBe(404);
    expect((await ask(USER, `${feedToken("secret", USER, 3)}.ics`)).status).toBe(404);
    expect(deps.loadState).not.toHaveBeenCalled();
  });

  it("answers an old link, a link turned off or a broken one as missing", async () => {
    expect((await ask(USER, `2.${feedToken("secret", USER, 2)}.ics`)).status).toBe(404);
    expect((await ask("not-a-user", `3.${feedToken("secret", USER, 3)}.ics`)).status).toBe(404);
    deps.loadState.mockResolvedValueOnce({ state: stateWith(false), revision: "1" });
    expect((await ask(USER, `3.${feedToken("secret", USER, 3)}.ics`)).status).toBe(404);
  });

  it("logs a failure to read the account", async () => {
    deps.loadState.mockRejectedValueOnce(new Error("down"));
    expect((await ask(USER, `3.${feedToken("secret", USER, 3)}.ics`)).status).toBe(500);
    expect(deps.logError).toHaveBeenCalledWith("calendar feed", expect.any(Error));
  });
});
