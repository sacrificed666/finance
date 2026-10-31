import type { RegistrationResponseJSON } from "@simplewebauthn/browser";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchPasskeys, registrationOptions, removePasskey, savePasskey } from "./passkeys";

// A fetch that answers with this reply
const answer = (reply: Response) => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(reply);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

// A fetch that fails as an offline browser does
const offline = () => vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline")));

// What a browser sends back after making a passkey
const REGISTRATION: RegistrationResponseJSON = {
  id: "cred",
  rawId: "cred",
  type: "public-key",
  response: { clientDataJSON: "", attestationObject: "" },
  clientExtensionResults: {},
};

const key = { id: "k", name: "Mac", createdAt: "2026-10-01T00:00:00Z", lastUsedAt: null };

describe("passkey requests", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists the passkeys, none when the server refuses", async () => {
    answer(Response.json({ passkeys: [key, { name: "broken" }] }));
    await expect(fetchPasskeys()).resolves.toEqual([key]);
    answer(new Response("no", { status: 500 }));
    await expect(fetchPasskeys()).resolves.toEqual([]);
  });

  it("asks for registration options and refuses ones a browser cannot use", async () => {
    answer(Response.json({ challenge: "c", rp: { name: "Finances" }, user: { id: "u", name: "me" } }));
    await expect(registrationOptions()).resolves.toMatchObject({ challenge: "c" });
    answer(Response.json({ challenge: 5 }));
    await expect(registrationOptions()).resolves.toBeNull();
  });

  it("removes a passkey by its id", async () => {
    const fetchMock = answer(Response.json({ passkeys: [] }));
    await expect(removePasskey("k")).resolves.toEqual([]);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "DELETE", body: JSON.stringify({ id: "k" }) });
  });

  it("saves a new passkey and fails quietly offline", async () => {
    const fetchMock = answer(Response.json({ passkeys: [key] }));
    await expect(savePasskey(REGISTRATION)).resolves.toEqual([key]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/passkeys",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ response: REGISTRATION }) }),
    );
    offline();
    await expect(fetchPasskeys()).resolves.toEqual([]);
    await expect(registrationOptions()).resolves.toBeNull();
    await expect(removePasskey("k")).resolves.toBeNull();
  });
});
