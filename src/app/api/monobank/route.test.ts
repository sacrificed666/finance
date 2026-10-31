import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MonoStored } from "@/features/import/api/monobank";
import { answerOf, request } from "@/test/http";

const deps = vi.hoisted(() => ({
  currentUserId: vi.fn<() => Promise<string | null>>(),
  loadMono: vi.fn<(userId: string) => Promise<MonoStored | null>>(),
  connectMono: vi.fn<(userId: string, token: string) => Promise<MonoStored>>(),
  deleteMono: vi.fn<(userId: string) => Promise<void>>(),
  logError: vi.fn<(route: string, error: unknown) => Promise<void>>(),
}));

vi.mock("@/features/auth/model/currentUser", () => ({ currentUserId: deps.currentUserId }));
vi.mock("@/features/import/api/monobank", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  loadMono: deps.loadMono,
  connectMono: deps.connectMono,
  deleteMono: deps.deleteMono,
}));
vi.mock("@/features/settings/api/errorLog", () => ({ logError: deps.logError }));

const { MonoError } = await import("@/features/import/api/monobank");
const { DELETE, GET, POST } = await import("./route");

const TOKEN = "u".repeat(44);
const STORED: MonoStored = { token: TOKEN, name: "Ann", accounts: [], fetchedAt: 1 };
const PUBLIC = { connected: true, name: "Ann", accounts: [], fetchedAt: 1, webhook: false };

// A connect request with a body
const connect = (body?: unknown) => POST(request("/api/monobank", "POST", body));

describe("/api/monobank", () => {
  beforeEach(() => {
    deps.currentUserId.mockResolvedValue("u1");
    deps.loadMono.mockReset().mockResolvedValue(STORED);
    deps.connectMono.mockReset().mockResolvedValue(STORED);
  });

  it("shows the connection without its token", async () => {
    await expect(answerOf(await GET())).resolves.toEqual({ status: 200, body: PUBLIC });
    deps.loadMono.mockResolvedValue(null);
    expect((await answerOf(await GET())).body).toMatchObject({ connected: false });
  });

  it("connects with a new token or refreshes with the stored one", async () => {
    const other = "n".repeat(30);
    await expect(answerOf(await connect({ token: other }))).resolves.toEqual({ status: 200, body: PUBLIC });
    expect(deps.connectMono).toHaveBeenLastCalledWith("u1", other);
    await connect();
    expect(deps.connectMono).toHaveBeenLastCalledWith("u1", TOKEN);
  });

  it("refuses bad tokens and answers bank failures", async () => {
    expect((await connect({ token: "short" })).status).toBe(400);
    deps.loadMono.mockResolvedValue(null);
    expect((await connect({})).status).toBe(400);
    deps.connectMono.mockRejectedValueOnce(new MonoError(403, "token"));
    await expect(answerOf(await connect({ token: TOKEN }))).resolves.toEqual({ status: 403, body: { error: "token" } });
    deps.connectMono.mockRejectedValueOnce(new Error("socket"));
    await expect(answerOf(await connect({ token: TOKEN }))).resolves.toEqual({
      status: 502,
      body: { error: "unreachable" },
    });
    expect(deps.logError).toHaveBeenCalledWith("api/monobank", expect.any(Error));
  });

  it("disconnects", async () => {
    await expect(answerOf(await DELETE())).resolves.toEqual({ status: 200, body: { ok: true } });
    expect(deps.deleteMono).toHaveBeenCalledWith("u1");
  });

  it("needs an account", async () => {
    deps.currentUserId.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await connect({ token: TOKEN })).status).toBe(401);
    expect((await DELETE()).status).toBe(401);
  });
});
