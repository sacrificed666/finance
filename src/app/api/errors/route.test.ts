import { beforeEach, describe, expect, it, vi } from "vitest";

import { answerOf } from "@/test/http";

const deps = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<{ user?: { id?: string; email?: string } } | null>>(),
  recentErrors: vi.fn<() => Promise<object>>(),
  clearErrors: vi.fn<() => Promise<void>>(),
  logError: vi.fn<(route: string, error: unknown, digest?: string) => Promise<void>>(),
}));

vi.mock("@/features/auth/model/auth", () => ({ auth: deps.auth }));
vi.mock("@/features/auth/model/authConfig", () => ({
  isOwnerEmail: (email?: string) => email === "owner@example.com",
}));
vi.mock("@/features/settings/api/errorLog", () => ({ logError: deps.logError }));
vi.mock("@/features/settings/api/errorStore", () => ({
  recentErrors: deps.recentErrors,
  clearErrors: deps.clearErrors,
}));

const { DELETE, GET, POST } = await import("./route");

// A failure report from the browser
const report = (body: unknown) =>
  POST(new Request("http://localhost/api/errors", { method: "POST", body: JSON.stringify(body) }));

describe("/api/errors", () => {
  beforeEach(() => {
    deps.auth.mockResolvedValue({ user: { id: "u1", email: "owner@example.com" } });
    deps.recentErrors.mockResolvedValue({ errors: [], total: 0 });
  });

  it("shows and clears the server errors for the owner", async () => {
    await expect(answerOf(await GET())).resolves.toEqual({ status: 200, body: { errors: [], total: 0 } });
    await expect(answerOf(await DELETE())).resolves.toEqual({ status: 200, body: { ok: true } });
    expect(deps.clearErrors).toHaveBeenCalledOnce();
  });

  it("turns away visitors and other accounts", async () => {
    deps.auth.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    deps.auth.mockResolvedValue({ user: { id: "u2", email: "other@example.com" } });
    await expect(answerOf(await GET())).resolves.toEqual({ status: 200, body: { errors: [], total: 0 } });
    expect((await DELETE()).status).toBe(403);
    expect(deps.recentErrors).not.toHaveBeenCalled();
    expect(deps.clearErrors).not.toHaveBeenCalled();
  });

  it("keeps what failed in a signed-in browser by the page alone, a few times at most", async () => {
    deps.auth.mockResolvedValue({ user: { id: "reporter", email: "me@example.com" } });
    deps.logError.mockReset().mockResolvedValue();
    expect((await report({ page: "/transactions", message: "TypeError: x is undefined", digest: "d1" })).status).toBe(
      200,
    );
    expect(deps.logError).toHaveBeenCalledWith("browser /transactions", "TypeError: x is undefined", "d1");
    expect((await report({ page: "/transactions?tx=1", message: "x" })).status).toBe(400);
    expect((await report({ page: "/", message: " " })).status).toBe(400);
    const answers = await Promise.all(Array.from({ length: 10 }, () => report({ page: "/", message: "again" })));
    expect(answers.map((answer) => answer.status)).toContain(429);
    deps.auth.mockResolvedValue(null);
    expect((await report({ page: "/", message: "x" })).status).toBe(401);
  });
});
