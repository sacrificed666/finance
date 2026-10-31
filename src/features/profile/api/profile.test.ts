import { afterEach, describe, expect, it, vi } from "vitest";

import { changePassword, endAllSessions, fetchProfile, fetchSignIns, parseProfile, saveDetails } from "./profile";

const DETAILS = { name: "", image: "", about: "", occupation: "", location: "", website: "", birthday: "" };

// A fetch that answers with this reply
const answer = (reply: Response) => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(reply);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const stored = {
  id: "u",
  email: "me@example.com",
  createdAt: "2026-01-01",
  hasPassword: true,
  providers: ["google", 5],
  passkeys: 2,
};

describe("parseProfile", () => {
  it("reads a profile and refuses an answer without an id", () => {
    expect(parseProfile(stored)).toMatchObject({
      id: "u",
      name: null,
      providers: ["google"],
      passkeys: 2,
      twoFactor: false,
    });
    expect(parseProfile({ email: "x" })).toBeNull();
  });
});

describe("profile requests", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the profile, or nothing when the server refuses", async () => {
    answer(Response.json(stored));
    await expect(fetchProfile()).resolves.toMatchObject({ id: "u" });
    answer(new Response("no", { status: 401 }));
    await expect(fetchProfile()).resolves.toBeNull();
  });

  it("passes on the server's reason for refusing details or a password", async () => {
    answer(Response.json({ error: "That date is in the future." }, { status: 400 }));
    await expect(
      saveDetails({
        name: "",
        image: "",
        about: "",
        occupation: "",
        location: "",
        website: "",
        birthday: "2099-01-01",
      }),
    ).resolves.toEqual({ ok: false, error: "That date is in the future." });
    answer(Response.json({ ok: true }));
    await expect(changePassword("old", "new")).resolves.toEqual({ ok: true, data: null });
  });

  it("keeps only the sign-ins it understands", async () => {
    answer(
      Response.json({
        current: "s1",
        entries: [
          { id: "s1", at: "2026-10-10T08:00:00Z", method: "passkey", device: "Mac", ip: "1.2.3.4" },
          { id: "s2", at: "2026-10-09T08:00:00Z", method: "telepathy" },
        ],
      }),
    );
    await expect(fetchSignIns()).resolves.toEqual({
      current: "s1",
      entries: [{ id: "s1", at: "2026-10-10T08:00:00Z", method: "passkey", device: "Mac", ip: "1.2.3.4" }],
    });
  });

  it("saves details and gives the stored profile back", async () => {
    const fetchMock = answer(Response.json(stored));
    await expect(saveDetails({ ...DETAILS, name: "Ann" })).resolves.toMatchObject({ ok: true, data: { id: "u" } });
    expect(fetchMock).toHaveBeenCalledWith("/api/profile", expect.objectContaining({ method: "PATCH" }));
  });

  it("gives no reason when the server cannot be reached or answers oddly", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline")));
    await expect(fetchProfile()).resolves.toBeNull();
    await expect(saveDetails(DETAILS)).resolves.toEqual({ ok: false, error: null });
    await expect(changePassword("a", "b")).resolves.toEqual({ ok: false, error: null });
    await expect(endAllSessions()).resolves.toBe(false);
    await expect(fetchSignIns()).resolves.toBeNull();
    answer(new Response("not json", { status: 403 }));
    await expect(changePassword("a", "b")).resolves.toEqual({ ok: false, error: null });
    answer(Response.json({ error: "password.problem.current" }, { status: 403 }));
    await expect(changePassword("a", "b")).resolves.toEqual({ ok: false, error: "password.problem.current" });
  });

  it("signs out everywhere", async () => {
    const fetchMock = answer(Response.json({ ok: true }));
    await expect(endAllSessions()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("/api/profile/sessions", { method: "DELETE" });
  });
});
