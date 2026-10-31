import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({
  ensureSchema: vi.fn<() => Promise<void>>(),
  startReminderClock: vi.fn<() => void>(),
  logError: vi.fn<(route: string, error: unknown, digest?: string) => Promise<void>>(),
}));

vi.mock("@/shared/api/db", () => ({ ensureSchema: deps.ensureSchema }));
vi.mock("@/features/notifications/model/reminderClock", () => ({ startReminderClock: deps.startReminderClock }));
vi.mock("@/features/settings/api/errorLog", () => ({ logError: deps.logError }));

const { onRequestError, register } = await import("./instrumentation");

const REQUEST = { path: "/api/state", method: "GET", headers: {} };
const CONTEXT = {
  routerKind: "App Router",
  routePath: "/api/state",
  routeType: "route",
  renderSource: undefined,
  revalidateReason: undefined,
} as const;

describe("instrumentation", () => {
  beforeEach(() => {
    deps.ensureSchema.mockReset().mockResolvedValue();
    deps.startReminderClock.mockReset();
    deps.logError.mockReset();
  });

  it("prepares the database and starts the reminder clock only on the Node.js server", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    vi.stubEnv("DATABASE_URL", "postgres://localhost/finance");
    await register();
    expect(deps.startReminderClock).not.toHaveBeenCalled();
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    await register();
    expect(deps.ensureSchema).toHaveBeenCalledOnce();
    expect(deps.startReminderClock).toHaveBeenCalledOnce();
  });

  it("boots without a database and when it is not up yet", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("DATABASE_URL", "");
    await register();
    expect(deps.ensureSchema).not.toHaveBeenCalled();
    vi.stubEnv("DATABASE_URL", "postgres://localhost/finance");
    deps.ensureSchema.mockRejectedValue(new Error("down"));
    await expect(register()).resolves.toBeUndefined();
    expect(deps.startReminderClock).toHaveBeenCalledTimes(2);
  });

  it("keeps server errors with their digest", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    const error = Object.assign(new Error("boom"), { digest: "123" });
    await onRequestError(error, REQUEST, CONTEXT);
    expect(deps.logError).toHaveBeenCalledWith("GET /api/state", error, "123");
    await onRequestError("odd", REQUEST, CONTEXT);
    expect(deps.logError.mock.lastCall?.slice(0, 2)).toEqual(["GET /api/state", "odd"]);
    expect(deps.logError.mock.lastCall?.[2]).toBeUndefined();
    vi.stubEnv("NEXT_RUNTIME", "edge");
    await onRequestError(error, REQUEST, CONTEXT);
    expect(deps.logError).toHaveBeenCalledTimes(2);
  });
});
