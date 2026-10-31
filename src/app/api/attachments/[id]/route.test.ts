import { beforeEach, describe, expect, it, vi } from "vitest";

import { request } from "@/test/http";

const deps = vi.hoisted(() => ({
  currentUserId: vi.fn<() => Promise<string | null>>(),
  loadAttachment: vi.fn<(userId: string, id: string) => Promise<{ mime: string; data: Buffer } | null>>(),
}));

vi.mock("@/features/auth/model/currentUser", () => ({ currentUserId: deps.currentUserId }));
vi.mock("@/features/transactions/api/attachments", () => ({ loadAttachment: deps.loadAttachment }));

const { GET } = await import("./route");

// The answer for a photo id
const photo = (id: string) => GET(request(`/api/attachments/${id}`, "GET"), { params: Promise.resolve({ id }) });

describe("GET /api/attachments/[id]", () => {
  beforeEach(() => {
    deps.currentUserId.mockResolvedValue("u1");
    deps.loadAttachment.mockReset().mockResolvedValue({ mime: "image/png", data: Buffer.from([7, 8]) });
  });

  it("gives the photo, cached privately", async () => {
    const response = await photo("photo-1");
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toBe("private, max-age=86400, immutable");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([7, 8]);
    expect(deps.loadAttachment).toHaveBeenCalledWith("u1", "photo-1");
  });

  it("refuses visitors, bad ids and missing photos", async () => {
    deps.currentUserId.mockResolvedValueOnce(null);
    expect((await photo("photo-1")).status).toBe(401);
    expect((await photo("../secret")).status).toBe(400);
    deps.loadAttachment.mockResolvedValue(null);
    expect((await photo("gone")).status).toBe(404);
  });
});
