import { createECDH } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import type { PushMessage } from "@/features/notifications/model/reminders";
import { answerQueries, result, type QueryFn } from "@/test/db";

import { base64url, type PushResult, type PushSubscriptionKeys, type VapidKeys } from "./webPush";

const db = vi.hoisted(() => ({ query: vi.fn<QueryFn>() }));
const deps = vi.hoisted(() => ({
  loadState: vi.fn<(userId: string) => Promise<{ state: AppState; revision: string }>>(),
  sendPush:
    vi.fn<
      (
        subscription: PushSubscriptionKeys,
        message: PushMessage,
        vapid: VapidKeys,
        subject: string,
      ) => Promise<PushResult>
    >(),
  logError: vi.fn<(where: string, error: unknown) => Promise<void>>(),
  reminderMessage: vi.fn<() => PushMessage | null>(),
}));

vi.mock("@/shared/api/db", () => ({ getPool: () => ({ query: db.query }), ensureSchema: () => Promise.resolve() }));
vi.mock("@/features/data/api/repo", () => ({ loadState: deps.loadState }));
vi.mock("@/features/settings/api/errorLog", () => ({ logError: deps.logError }));
vi.mock("@/features/notifications/model/reminders", () => ({
  dueReminders: () => [],
  reminderMessage: deps.reminderMessage,
}));
vi.mock("./webPush", async (importOriginal) => ({ ...(await importOriginal<object>()), sendPush: deps.sendPush }));

const SECRET = Buffer.alloc(32, 5).toString("base64");
const HELLO: PushMessage = { title: "Hi", body: "Hello", url: "/", tag: "hello" };
const DUE: PushMessage = { title: "Due today", body: "Rent", url: "/calendar", tag: "digest" };

// A device subscription a push service would give
const device = (name: string): PushSubscriptionKeys => ({
  endpoint: `https://fcm.googleapis.com/fcm/send/${name}`,
  keys: { p256dh: base64url(createECDH("prime256v1").generateKeys()), auth: base64url(Buffer.alloc(16, 9)) },
});

// The push modules as a server with these settings would load them
const load = async (env: Record<string, string>) => {
  vi.resetModules();
  for (const [name, value] of Object.entries({
    DATA_ENCRYPTION_KEY: "",
    AUTH_SECRET: "",
    VAPID_SUBJECT: "",
    OWNER_EMAIL: "",
    AUTH_URL: "",
    REMINDER_HOUR: "",
    ...env,
  })) {
    vi.stubEnv(name, value);
  }
  return import("./push");
};

// The sealed subscriptions by account and device, as the table would keep them
const devices = new Map<string, { user: string; id: string; secret: string }>();

// The state of an account in a language
const stateIn = (locale: AppState["settings"]["locale"]): { state: AppState; revision: string } => ({
  state: { ...DEFAULT_STATE, settings: { ...DEFAULT_STATE.settings, locale } },
  revision: "",
});

describe("push", () => {
  beforeEach(() => {
    devices.clear();
    for (const mock of Object.values(deps)) mock.mockReset();
    deps.sendPush.mockResolvedValue("sent");
    deps.loadState.mockResolvedValue(stateIn("en"));
    answerQueries(db.query, [
      [
        /^INSERT INTO push_subscriptions/u,
        ([user, id, secret]) => (
          devices.set(`${String(user)}:${String(id)}`, { user: String(user), id: String(id), secret: String(secret) }),
          []
        ),
      ],
      [/^DELETE FROM push_subscriptions/u, ([user, id]) => (devices.delete(`${String(user)}:${String(id)}`), [])],
      [
        /^SELECT id, secret FROM push_subscriptions/u,
        ([user]) => [...devices.values()].filter((row) => row.user === user),
      ],
      [/^UPDATE users SET reminded_on/u, () => result([{ id: "u1" }, { id: "u2" }, { id: "u3" }])],
    ]);
  });

  it("stays off without a secret", async () => {
    const push = await load({});
    expect(push.pushKey()).toBeNull();
    await expect(push.pushTo("u1", HELLO)).resolves.toEqual({ sent: 0, failed: 0 });
    await expect(push.sendDigests()).resolves.toEqual({ checked: 0, sent: 0 });
    expect(db.query).not.toHaveBeenCalled();
  });

  it("keeps valid devices sealed and forgets them on request", async () => {
    const push = await load({ DATA_ENCRYPTION_KEY: SECRET });
    expect(push.pushKey()).toMatch(/^[\w-]{87}$/u);
    await expect(push.saveDevice("u1", { endpoint: "https://evil.example/x", keys: device("a").keys })).resolves.toBe(
      false,
    );
    const phone = device("phone");
    await expect(push.saveDevice("u1", phone)).resolves.toBe(true);
    await expect(push.saveDevice("u1", phone)).resolves.toBe(true);
    expect(devices.size).toBe(1);
    const [stored] = devices.values();
    expect(stored?.id).toMatch(/^[\w-]{32}$/u);
    expect(stored?.secret).toMatch(/^enc\.v2\./u);
    await push.removeDevice("u1", phone.endpoint);
    expect(devices.size).toBe(0);
  });

  it("sends to every device or one, dropping devices that are gone", async () => {
    const push = await load({ AUTH_SECRET: "auth", OWNER_EMAIL: "Owner@Example.com" });
    const [phone, laptop] = [device("phone"), device("laptop")];
    await push.saveDevice("u1", phone);
    await push.saveDevice("u1", laptop);
    await push.saveDevice("u2", device("other"));
    deps.sendPush.mockImplementation((subscription) =>
      Promise.resolve(subscription.endpoint === laptop.endpoint ? "gone" : "sent"),
    );

    await expect(push.pushTo("u1", HELLO)).resolves.toEqual({ sent: 1, failed: 1 });
    expect(deps.sendPush).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: phone.endpoint }),
      HELLO,
      expect.anything(),
      "mailto:owner@example.com",
    );
    expect([...devices.values()].filter((row) => row.user === "u1")).toHaveLength(1);
    deps.sendPush.mockClear();
    await expect(push.pushTo("u1", HELLO, phone.endpoint)).resolves.toEqual({ sent: 1, failed: 0 });
    expect(deps.sendPush).toHaveBeenCalledOnce();
  });

  it("names the site or a set contact to the push services", async () => {
    const site = await load({ AUTH_SECRET: "auth", AUTH_URL: "https://money.example" });
    await site.saveDevice("u1", device("phone"));
    await site.pushTo("u1", HELLO);
    expect(deps.sendPush.mock.calls.at(-1)?.[3]).toBe("https://money.example");
    const set = await load({
      AUTH_SECRET: "auth",
      AUTH_URL: "http://localhost:3000",
      VAPID_SUBJECT: " mailto:me@example.com ",
    });
    await set.pushTo("u1", HELLO);
    expect(deps.sendPush.mock.calls.at(-1)?.[3]).toBe("mailto:me@example.com");
    const plain = await load({ AUTH_SECRET: "auth", AUTH_URL: "http://localhost:3000" });
    await plain.pushTo("u1", HELLO);
    expect(deps.sendPush.mock.calls.at(-1)?.[3]).toBe("mailto:owner@example.com");
  });

  it("writes the test message in the account's language", async () => {
    const push = await load({ AUTH_SECRET: "auth", REMINDER_HOUR: "8" });
    deps.loadState.mockResolvedValue(stateIn("uk"));
    await expect(push.testMessage("u1")).resolves.toEqual({
      title: "Сповіщення працюють",
      body: expect.stringContaining("8"),
      url: "/settings",
      tag: "test",
    });
  });

  it("sends each due digest from the reminder hour on and logs the failures", async () => {
    const push = await load({ AUTH_SECRET: "auth", REMINDER_HOUR: "9" });
    await push.saveDevice("u1", device("phone"));
    await expect(push.sendDigests(new Date("2026-10-18T05:00:00Z"))).resolves.toEqual({ checked: 0, sent: 0 });
    expect(db.query.mock.calls.some(([sql]) => sql.startsWith("UPDATE"))).toBe(false);

    deps.reminderMessage.mockReturnValueOnce(DUE).mockReturnValueOnce(null);
    deps.loadState
      .mockResolvedValueOnce(stateIn("en"))
      .mockResolvedValueOnce(stateIn("de"))
      .mockRejectedValueOnce(new Error("broken"));
    await expect(push.sendDigests(new Date("2026-10-18T07:00:00Z"))).resolves.toEqual({ checked: 3, sent: 1 });
    expect(db.query.mock.calls.find(([sql]) => sql.startsWith("UPDATE"))?.[1]).toEqual(["2026-10-18"]);
    expect(deps.sendPush).toHaveBeenCalledWith(expect.anything(), DUE, expect.anything(), expect.any(String));
    expect(deps.logError).toHaveBeenCalledWith("push digest", expect.objectContaining({ message: "broken" }));
  });

  it("tries a digest again later when no device took it", async () => {
    const push = await load({ AUTH_SECRET: "auth", REMINDER_HOUR: "9" });
    await push.saveDevice("u1", device("phone"));
    deps.sendPush.mockResolvedValue("failed");
    deps.reminderMessage.mockReturnValueOnce(DUE).mockReturnValue(null);
    await expect(push.sendDigests(new Date("2026-10-18T07:00:00Z"))).resolves.toEqual({ checked: 3, sent: 0 });
    expect(
      db.query.mock.calls.filter(([sql]) => sql.includes("reminded_on = NULL")).map(([, params]) => params),
    ).toEqual([["u1", "2026-10-18"]]);
  });

  it("adds the weekly summary an account asked for on Mondays", async () => {
    const push = await load({ AUTH_SECRET: "auth", REMINDER_HOUR: "9" });
    await push.saveDevice("u1", device("phone"));
    const asked = stateIn("en");
    asked.state = {
      ...asked.state,
      settings: { ...asked.state.settings, notify: { summary: "weekly" } },
      transactions: [
        { id: "food", type: "expense", amount: 800, currency: "UAH", categoryId: "cat-groceries", date: "2026-10-14" },
      ],
    };
    deps.loadState.mockResolvedValue(asked);
    deps.reminderMessage.mockReturnValue(null);
    await push.sendDigests(new Date("2026-10-19T07:00:00Z"));
    expect(deps.sendPush).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ title: "Your week in short", url: "/reports" }),
      expect.anything(),
      expect.any(String),
    );
  });
});
