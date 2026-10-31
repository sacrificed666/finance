import { describe, expect, it, vi } from "vitest";

import { remindToken } from "@/features/notifications/model/reminderClock";
import { answerOf, request } from "@/test/http";

const sendDigests = vi.hoisted(() => vi.fn<() => Promise<{ checked: number; sent: number }>>());

vi.mock("@/features/notifications/model/push", () => ({ sendDigests }));

const { POST } = await import("./route");

// The reminder clock's call with a token
const remind = (token: string) => POST(request("/api/push/remind", "POST", undefined, { "x-remind-token": token }));

describe("POST /api/push/remind", () => {
  it("sends the digests when the clock proves itself", async () => {
    vi.stubEnv("AUTH_SECRET", "secret");
    sendDigests.mockResolvedValue({ checked: 2, sent: 1 });
    await expect(answerOf(await remind(remindToken("secret")))).resolves.toEqual({
      status: 200,
      body: { checked: 2, sent: 1 },
    });
  });

  it("hides from anyone else", async () => {
    vi.stubEnv("AUTH_SECRET", "secret");
    expect((await remind(remindToken("other"))).status).toBe(404);
    expect((await remind("short")).status).toBe(404);
    vi.stubEnv("AUTH_SECRET", "");
    expect((await remind("")).status).toBe(404);
    expect(sendDigests).not.toHaveBeenCalled();
  });
});
