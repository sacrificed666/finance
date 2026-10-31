import { beforeEach, describe, expect, it, vi } from "vitest";

import { answerOf, request } from "@/test/http";

const deps = vi.hoisted(() => ({
  currentUserId: vi.fn<() => Promise<string | null>>(),
  saveAttachment: vi.fn<(userId: string, mime: string, data: Buffer) => Promise<string | null>>(),
}));

vi.mock("@/features/auth/model/currentUser", () => ({ currentUserId: deps.currentUserId }));
vi.mock("@/features/transactions/api/attachments", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  saveAttachment: deps.saveAttachment,
}));

const { POST } = await import("./route");

// An upload of a photo
const upload = (body: unknown) => POST(request("/api/attachments", "POST", body));

const PHOTO = Buffer.from([1, 2, 3]).toString("base64");

describe("POST /api/attachments", () => {
  beforeEach(() => {
    deps.currentUserId.mockResolvedValue("u1");
    deps.saveAttachment.mockReset().mockResolvedValue("photo-1");
  });

  it("stores a photo and gives its id", async () => {
    await expect(answerOf(await upload({ mime: "image/webp", data: PHOTO }))).resolves.toEqual({
      status: 200,
      body: { id: "photo-1" },
    });
    expect(deps.saveAttachment).toHaveBeenCalledWith("u1", "image/webp", Buffer.from([1, 2, 3]));
  });

  it("says when the account has no room left for photos", async () => {
    deps.saveAttachment.mockResolvedValue(null);
    expect((await upload({ mime: "image/webp", data: PHOTO })).status).toBe(507);
  });

  it("refuses other files, empty ones and big ones", async () => {
    expect((await upload("{")).status).toBe(400);
    expect((await upload({ mime: "image/gif", data: PHOTO })).status).toBe(400);
    expect((await upload({ mime: "image/png" })).status).toBe(400);
    expect((await upload({ mime: "image/png", data: "" })).status).toBe(413);
    expect((await upload({ mime: "image/png", data: Buffer.alloc(1_500_001).toString("base64") })).status).toBe(413);
    expect(deps.saveAttachment).not.toHaveBeenCalled();
  });

  it("needs an account and allows 30 uploads a minute", async () => {
    deps.currentUserId.mockResolvedValueOnce(null);
    expect((await upload({ mime: "image/png", data: PHOTO })).status).toBe(401);
    deps.currentUserId.mockResolvedValue("busy");
    const answers = await Promise.all(Array.from({ length: 31 }, () => upload({ mime: "image/png", data: PHOTO })));
    expect(answers.map((answer) => answer.status).filter((status) => status === 429)).toHaveLength(1);
  });
});
