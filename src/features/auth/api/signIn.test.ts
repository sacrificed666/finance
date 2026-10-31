import { beforeEach, describe, expect, it, vi } from "vitest";

interface SignInResult {
  error?: string;
  code?: string;
}

const auth = vi.hoisted(() => ({
  signIn: vi.fn<(provider: string, options: object) => Promise<SignInResult>>(),
  startAuthentication: vi.fn<(options: object) => Promise<object>>(),
}));

vi.mock("next-auth/react", () => ({ signIn: auth.signIn }));
vi.mock("@simplewebauthn/browser", () => ({ startAuthentication: auth.startAuthentication }));

const { registerAccount, signInWithGoogle, signInWithPasskey, signInWithPassword } = await import("./signIn");

const fetchMock = vi.fn<typeof fetch>();

// A JSON answer from the server
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("signIn", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    auth.signIn.mockReset().mockResolvedValue({});
    auth.startAuthentication.mockReset().mockResolvedValue({ id: "cred" });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("registers an account or gives the server's reason", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "u1" }, 201));
    await expect(registerAccount({ email: "a@example.com", password: "pw", name: "A" })).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@example.com", password: "pw", name: "A" }),
    });
    fetchMock.mockResolvedValueOnce(json({ error: "taken" }, 409));
    await expect(registerAccount({ email: "a@example.com", password: "pw", name: "A" })).resolves.toBe("taken");
    fetchMock.mockResolvedValueOnce(new Response("oops", { status: 500 }));
    await expect(registerAccount({ email: "a@example.com", password: "pw", name: "A" })).resolves.toBe("");
  });

  it("signs in with a password and says when a code is needed", async () => {
    await expect(signInWithPassword("a@example.com", "pw", "")).resolves.toBe("ok");
    expect(auth.signIn).toHaveBeenCalledWith("credentials", {
      email: "a@example.com",
      password: "pw",
      code: "",
      redirect: false,
    });
    auth.signIn.mockResolvedValueOnce({ error: "CredentialsSignin", code: "two_factor" });
    await expect(signInWithPassword("a@example.com", "pw", "")).resolves.toBe("two_factor");
    auth.signIn.mockResolvedValueOnce({ error: "CredentialsSignin", code: "two_factor_wrong" });
    await expect(signInWithPassword("a@example.com", "pw", "1")).resolves.toBe("two_factor_wrong");
    auth.signIn.mockResolvedValueOnce({ error: "CredentialsSignin", code: "credentials" });
    await expect(signInWithPassword("a@example.com", "bad", "")).resolves.toBe("failed");
  });

  it("signs in with a passkey of this device", async () => {
    fetchMock.mockResolvedValueOnce(json({ challenge: "abc" }));
    await expect(signInWithPasskey()).resolves.toBe("ok");
    expect(auth.startAuthentication).toHaveBeenCalledWith({ optionsJSON: { challenge: "abc" } });
    expect(auth.signIn).toHaveBeenCalledWith("passkey", { response: '{"id":"cred"}', redirect: false });

    fetchMock.mockResolvedValueOnce(json({ challenge: "abc" }));
    auth.startAuthentication.mockRejectedValueOnce(Object.assign(new Error("closed"), { name: "NotAllowedError" }));
    await expect(signInWithPasskey()).resolves.toBe("cancelled");
    fetchMock.mockResolvedValueOnce(json({ challenge: "abc" }));
    auth.startAuthentication.mockRejectedValueOnce(new Error("broken"));
    await expect(signInWithPasskey()).resolves.toBe("failed");
    fetchMock.mockResolvedValueOnce(json({ challenge: "abc" }));
    auth.signIn.mockResolvedValueOnce({ error: "CredentialsSignin" });
    await expect(signInWithPasskey()).resolves.toBe("failed");
  });

  it("fails a passkey sign-in without usable options", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await expect(signInWithPasskey()).resolves.toBe("failed");
    fetchMock.mockResolvedValueOnce(json({ error: "no" }, 500));
    await expect(signInWithPasskey()).resolves.toBe("failed");
    fetchMock.mockResolvedValueOnce(json({ rpId: "x" }));
    await expect(signInWithPasskey()).resolves.toBe("failed");
    expect(auth.startAuthentication).not.toHaveBeenCalled();
  });

  it("sends Google sign-ins back to the page", async () => {
    await signInWithGoogle("/reports");
    expect(auth.signIn).toHaveBeenCalledWith("google", { redirectTo: "/reports" });
  });
});
