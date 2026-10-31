import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PushMessage } from "@/features/notifications/model/reminders";
import { answerOf, request } from "@/test/http";

const deps = vi.hoisted(() => ({
  currentUserId: vi.fn<() => Promise<string | null>>(),
  pushTo:
    vi.fn<(userId: string, message: PushMessage, endpoint?: string) => Promise<{ sent: number; failed: number }>>(),
}));

const MESSAGE: PushMessage = { title: "It works", body: "Hi", url: "/settings", tag: "test" };

vi.mock("@/features/auth/model/currentUser", () => ({ currentUserId: deps.currentUserId }));
vi.mock("@/features/notifications/model/push", () => ({
  pushTo: deps.pushTo,
  testMessage: () => Promise.resolve({ title: "It works", body: "Hi", url: "/settings", tag: "test" }),
}));

const { POST } = await import("./route");

// A test request for a device, from an address
const test = (body: unknown, ip = "10.6.0.1") =>
  POST(request("/api/push/test", "POST", body, { "x-forwarded-for": ip }));

describe("POST /api/push/test", () => {
  beforeEach(() => {
    deps.currentUserId.mockResolvedValue("u1");
    deps.pushTo.mockReset().mockResolvedValue({ sent: 1, failed: 0 });
  });

  it("sends the test message to the device", async () => {
    await expect(answerOf(await test({ endpoint: "https://push.example/1" }))).resolves.toEqual({
      status: 200,
      body: { ok: true },
    });
    expect(deps.pushTo).toHaveBeenCalledWith("u1", MESSAGE, "https://push.example/1");
  });

  it("says when nothing was sent or the device is missing", async () => {
    deps.pushTo.mockResolvedValue({ sent: 0, failed: 1 });
    expect((await test({ endpoint: "https://push.example/1" }, "10.6.0.2")).status).toBe(502);
    expect((await test({}, "10.6.0.2")).status).toBe(400);
  });

  it("needs an account and allows five tests in 15 minutes", async () => {
    deps.currentUserId.mockResolvedValueOnce(null);
    expect((await test({ endpoint: "x" })).status).toBe(401);
    deps.currentUserId.mockResolvedValue("busy");
    const answers = await Promise.all(Array.from({ length: 6 }, () => test({ endpoint: "x" }, "10.6.0.3")));
    expect(answers.at(-1)?.status).toBe(429);
  });
});
