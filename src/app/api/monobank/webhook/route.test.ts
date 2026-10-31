import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MonoStored } from "@/features/import/api/monobank";
import { answerOf, request } from "@/test/http";

const deps = vi.hoisted(() => ({
  currentUserId: vi.fn<() => Promise<string | null>>(),
  setMonoWebhook: vi.fn<(userId: string, origin: string | null) => Promise<MonoStored>>(),
  logError: vi.fn<(route: string, error: unknown) => Promise<void>>(),
}));

vi.mock("@/features/auth/model/currentUser", () => ({ currentUserId: deps.currentUserId }));
vi.mock("@/features/import/api/monobank", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  setMonoWebhook: deps.setMonoWebhook,
}));
vi.mock("@/features/settings/api/errorLog", () => ({ logError: deps.logError }));

const { MonoError } = await import("@/features/import/api/monobank");
const { POST } = await import("./route");

// A request to turn live updates on or off
const toggle = (on: boolean) => POST(request("/api/monobank/webhook", "POST", { on }));

describe("POST /api/monobank/webhook", () => {
  beforeEach(() => {
    deps.currentUserId.mockResolvedValue("u1");
    deps.setMonoWebhook
      .mockReset()
      .mockResolvedValue({ token: "t", webhookKey: "k", webhookUrl: "https://money.example/x" });
    vi.stubEnv("AUTH_URL", "https://money.example");
  });

  it("turns live updates on at the site and off", async () => {
    expect((await answerOf(await toggle(true))).body).toMatchObject({ connected: true, webhook: true });
    expect(deps.setMonoWebhook).toHaveBeenLastCalledWith("u1", "https://money.example");
    await toggle(false);
    expect(deps.setMonoWebhook).toHaveBeenLastCalledWith("u1", null);
  });

  it("needs an https site to turn them on", async () => {
    vi.stubEnv("AUTH_URL", "http://localhost:3000");
    await expect(answerOf(await toggle(true))).resolves.toEqual({ status: 400, body: { error: "https" } });
    expect((await toggle(false)).status).toBe(200);
  });

  it("answers bank failures and visitors", async () => {
    deps.setMonoWebhook.mockRejectedValueOnce(new MonoError(409, "not-connected"));
    expect((await toggle(true)).status).toBe(409);
    deps.setMonoWebhook.mockRejectedValueOnce(new Error("socket"));
    expect((await toggle(true)).status).toBe(502);
    expect(deps.logError).toHaveBeenCalledOnce();
    deps.currentUserId.mockResolvedValue(null);
    expect((await toggle(true)).status).toBe(401);
  });
});
