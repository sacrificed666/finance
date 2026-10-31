import { describe, expect, it, vi } from "vitest";

const handlers = vi.hoisted(() => ({
  GET: vi.fn<(request: Request) => Promise<Response>>(),
  POST: vi.fn<(request: Request) => Promise<Response>>(),
}));

vi.mock("@/features/auth/model/auth", () => ({ handlers }));

const route = await import("./route");

describe("/api/auth/[...nextauth]", () => {
  it("hands every Auth.js request to its handlers", () => {
    expect(route.GET).toBe(handlers.GET);
    expect(route.POST).toBe(handlers.POST);
  });
});
