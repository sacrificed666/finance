import { describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({
  signIn: vi.fn<(provider: string, options: object) => Promise<void>>(),
  signOut: vi.fn<(options: object) => Promise<void>>(),
  clearOutbox: vi.fn<() => Promise<void>>(),
}));

vi.mock("next-auth/react", () => ({ signIn: deps.signIn, signOut: deps.signOut }));
vi.mock("@/features/data/model/outbox", () => ({ clearOutbox: deps.clearOutbox }));

const { leave, linkGoogle } = await import("./session");

describe("session", () => {
  it("links Google and comes back to the profile", async () => {
    await linkGoogle();
    expect(deps.signIn).toHaveBeenCalledWith("google", { redirectTo: "/profile" });
  });

  it("drops the waiting changes before signing out", async () => {
    const order: string[] = [];
    deps.clearOutbox.mockImplementation(() => (order.push("outbox"), Promise.resolve()));
    deps.signOut.mockImplementation(() => (order.push("signOut"), Promise.resolve()));
    await leave();
    expect(order).toEqual(["outbox", "signOut"]);
    expect(deps.signOut).toHaveBeenCalledWith({ redirectTo: "/login" });
  });
});
