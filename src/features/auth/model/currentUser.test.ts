import { describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ value: null as { user?: { id?: string } } | null }));

vi.mock("@/features/auth/model/auth", () => ({ auth: () => Promise.resolve(session.value) }));

import { currentUserId } from "./currentUser";

describe("currentUserId", () => {
  it("gives the signed-in account, or null for a visitor", async () => {
    session.value = { user: { id: "u1" } };
    await expect(currentUserId()).resolves.toBe("u1");
    session.value = { user: {} };
    await expect(currentUserId()).resolves.toBeNull();
    session.value = null;
    await expect(currentUserId()).resolves.toBeNull();
  });
});
