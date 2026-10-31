import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { bytesOf, pushSetup, sameKey, sendTest, subscribe, unsubscribe } from "./subscription";

const KEY = "AQID_-8";

// A browser subscription made with a key
const subscriptionWith = (key: Uint8Array) => ({
  endpoint: "https://push.example/1",
  options: { applicationServerKey: key.buffer },
  toJSON: () => ({ endpoint: "https://push.example/1" }),
  unsubscribe: vi.fn<() => Promise<boolean>>(() => Promise.resolve(true)),
});

type FakeSubscription = ReturnType<typeof subscriptionWith>;

const pushManager = {
  getSubscription: vi.fn<() => Promise<FakeSubscription | null>>(),
  subscribe: vi.fn<(options: object) => Promise<FakeSubscription>>(),
};
const notification = { permission: "default", requestPermission: vi.fn<() => Promise<string>>() };
const fetchMock = vi.fn<typeof fetch>();

// A browser that can take notifications, with the app's service worker
const capableBrowser = () => {
  vi.stubGlobal("PushManager", {});
  vi.stubGlobal("Notification", notification);
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { getRegistration: () => Promise.resolve({ pushManager }) },
  });
};

// The JSON the push endpoint answers with
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("keys", () => {
  it("decodes a base64url key and compares it with a stored one", () => {
    const key = bytesOf(KEY);
    expect([...key]).toEqual([1, 2, 3, 255, 239]);
    expect(sameKey(key.buffer, key)).toBe(true);
    expect(sameKey(new Uint8Array([1, 2]).buffer, key)).toBe(false);
    expect(sameKey(new Uint8Array([1, 2, 3, 255, 0]).buffer, key)).toBe(false);
    expect(sameKey(null, key)).toBe(false);
  });
});

describe("subscription", () => {
  beforeEach(() => {
    notification.permission = "default";
    notification.requestPermission.mockReset();
    pushManager.getSubscription.mockReset().mockResolvedValue(null);
    pushManager.subscribe.mockReset();
    fetchMock.mockReset().mockImplementation(() => Promise.resolve(json({ ok: true })));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, "serviceWorker");
  });

  it("says when the browser cannot take notifications", async () => {
    await expect(pushSetup(true)).resolves.toMatchObject({ status: "unsupported", key: null });
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)");
    await expect(pushSetup(true)).resolves.toMatchObject({ status: "ios" });
  });

  it("stays off in development and without a server key", async () => {
    capableBrowser();
    await expect(pushSetup(false)).resolves.toEqual({ status: "dev", key: null, hour: 9 });
    fetchMock.mockResolvedValueOnce(json({ key: null, hour: 8 }));
    await expect(pushSetup(true)).resolves.toEqual({ status: "server", key: null, hour: 8 });
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await expect(pushSetup(true)).resolves.toMatchObject({ status: "server", hour: 9 });
  });

  it("refreshes a subscription made with the current key", async () => {
    capableBrowser();
    const current = subscriptionWith(bytesOf(KEY));
    pushManager.getSubscription.mockResolvedValue(current);
    fetchMock.mockResolvedValueOnce(json({ key: KEY, hour: 9 }));
    await expect(pushSetup(true)).resolves.toMatchObject({ status: "on" });
    expect(fetchMock).toHaveBeenLastCalledWith("/api/push", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: { endpoint: "https://push.example/1" } }),
    });
  });

  it("drops a subscription of an older key and respects a refusal", async () => {
    capableBrowser();
    const old = subscriptionWith(new Uint8Array([9, 9, 9, 9, 9]));
    pushManager.getSubscription.mockResolvedValue(old);
    fetchMock.mockImplementation(() => Promise.resolve(json({ key: KEY, hour: 9 })));
    await expect(pushSetup(true)).resolves.toMatchObject({ status: "off" });
    expect(old.unsubscribe).toHaveBeenCalledOnce();
    pushManager.getSubscription.mockResolvedValue(null);
    await expect(pushSetup(true)).resolves.toMatchObject({ status: "off" });
    notification.permission = "denied";
    await expect(pushSetup(true)).resolves.toMatchObject({ status: "denied" });
  });

  it("subscribes once allowed and tells the server", async () => {
    capableBrowser();
    const key = bytesOf(KEY);
    const made = subscriptionWith(key);
    pushManager.subscribe.mockResolvedValue(made);
    notification.requestPermission.mockResolvedValue("granted");
    await expect(subscribe(key)).resolves.toBe("on");
    expect(pushManager.subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: key });

    fetchMock.mockResolvedValueOnce(json({ error: "subscription" }, 400));
    await expect(subscribe(key)).resolves.toBe("failed");
    expect(made.unsubscribe).toHaveBeenCalledOnce();
    pushManager.subscribe.mockRejectedValueOnce(new Error("no"));
    await expect(subscribe(key)).resolves.toBe("failed");
  });

  it("asks first and stops when the answer is no", async () => {
    capableBrowser();
    notification.requestPermission.mockResolvedValueOnce("denied").mockResolvedValueOnce("default");
    await expect(subscribe(bytesOf(KEY))).resolves.toBe("denied");
    await expect(subscribe(bytesOf(KEY))).resolves.toBe("off");
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });

  it("unsubscribes and tells the server", async () => {
    capableBrowser();
    await unsubscribe();
    expect(fetchMock).not.toHaveBeenCalled();
    const current = subscriptionWith(bytesOf(KEY));
    pushManager.getSubscription.mockResolvedValue(current);
    await unsubscribe();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/push",
      expect.objectContaining({ method: "DELETE", body: JSON.stringify({ endpoint: current.endpoint }) }),
    );
    expect(current.unsubscribe).toHaveBeenCalledOnce();
  });

  it("asks for a test notification", async () => {
    capableBrowser();
    await expect(sendTest()).resolves.toBe("failed");
    pushManager.getSubscription.mockResolvedValue(subscriptionWith(bytesOf(KEY)));
    await expect(sendTest()).resolves.toBe("sent");
    expect(fetchMock).toHaveBeenLastCalledWith("/api/push/test", expect.objectContaining({ method: "POST" }));
    fetchMock.mockResolvedValueOnce(json({ error: "wait" }, 429));
    await expect(sendTest()).resolves.toBe("wait");
    fetchMock.mockResolvedValueOnce(json({ error: "failed" }, 502));
    await expect(sendTest()).resolves.toBe("failed");
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await expect(sendTest()).resolves.toBe("failed");
  });
});
