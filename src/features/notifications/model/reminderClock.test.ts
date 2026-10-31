import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { remindToken, startReminderClock } from "./reminderClock";

const fetchMock = vi.fn<typeof fetch>();
const unref = vi.fn<() => void>();

// The timers the clock set, by kind, with their callbacks and delays
const timers: Array<{ kind: "interval" | "timeout"; callback: () => void; ms: number }> = [];

// A stand-in for Node's timer that only remembers what it was given
const timer = (kind: "interval" | "timeout") => (callback: () => void, ms: number) => {
  timers.push({ kind, callback, ms });
  return { unref };
};

// Runs the callback of the first timer of a kind
const fire = (kind: "interval" | "timeout") => timers.find((entry) => entry.kind === kind)?.callback();

describe("reminderClock", () => {
  beforeEach(() => {
    timers.length = 0;
    unref.mockReset();
    fetchMock.mockReset().mockResolvedValue(new Response(null));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("setInterval", timer("interval"));
    vi.stubGlobal("setTimeout", timer("timeout"));
    globalThis.financeReminderClock = undefined;
  });

  afterEach(() => {
    globalThis.financeReminderClock = undefined;
  });

  it("signs its calls with a token only the secret gives", () => {
    expect(remindToken("one")).toBe(remindToken("one"));
    expect(remindToken("one")).not.toBe(remindToken("two"));
    expect(remindToken("one")).toMatch(/^[\w-]{43}$/u);
  });

  it("asks for the digests a minute after start and then every 15 minutes", () => {
    vi.stubEnv("AUTH_SECRET", "secret");
    vi.stubEnv("PORT", " 4000 ");
    vi.stubEnv("REMINDERS", "");
    startReminderClock();
    startReminderClock();
    expect(timers.map(({ kind, ms }) => [kind, ms])).toEqual([
      ["interval", 900_000],
      ["timeout", 60_000],
    ]);
    expect(unref).toHaveBeenCalledTimes(2);
    fire("timeout");
    fire("interval");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:4000/api/push/remind", {
      method: "POST",
      headers: { "x-remind-token": remindToken("secret") },
    });
  });

  it("calls the default port and shrugs off a failed call", async () => {
    vi.stubEnv("AUTH_SECRET", "secret");
    vi.stubEnv("PORT", "");
    fetchMock.mockRejectedValue(new Error("down"));
    startReminderClock();
    fire("timeout");
    await Promise.resolve();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://127.0.0.1:3000/api/push/remind");
  });

  it("stays off without a secret or when turned off", () => {
    vi.stubEnv("AUTH_SECRET", "");
    startReminderClock();
    vi.stubEnv("AUTH_SECRET", "secret");
    vi.stubEnv("REMINDERS", "off");
    startReminderClock();
    expect(timers).toEqual([]);
  });
});
