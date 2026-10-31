import { screen } from "@testing-library/react";
import type { useRouter } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { registerAccount, signInWithPasskey, signInWithPassword } from "@/features/auth/api/signIn";
import { renderWithI18n } from "@/test/render";

import SignInPage from "./SignInPage";

type Router = ReturnType<typeof useRouter>;

const router = vi.hoisted(() => ({
  back: vi.fn<Router["back"]>(),
  forward: vi.fn<Router["forward"]>(),
  refresh: vi.fn<Router["refresh"]>(),
  push: vi.fn<Router["push"]>(),
  replace: vi.fn<Router["replace"]>(),
  prefetch: vi.fn<Router["prefetch"]>(),
}));
const search = vi.hoisted(() => ({ next: "/reports" }));
const webAuthn = vi.hoisted(() => ({ supported: false }));
const requests = vi.hoisted(() => ({
  registerAccount: vi.fn<typeof registerAccount>(),
  signInWithPassword: vi.fn<typeof signInWithPassword>(),
  signInWithPasskey: vi.fn<typeof signInWithPasskey>(),
  signInWithGoogle: vi.fn<(next: string) => Promise<void>>(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams({ next: search.next }),
}));
vi.mock(import("@/features/auth/api/signIn"), () => requests);
vi.mock("@simplewebauthn/browser", () => ({ browserSupportsWebAuthn: () => webAuthn.supported }));

// Types an email and password into the form
const fill = async (user: ReturnType<typeof renderWithI18n>["user"], password = "secret") => {
  await user.type(screen.getByPlaceholderText("you@example.com"), "me@example.com");
  await user.type(screen.getByPlaceholderText("••••••••••"), password);
};

describe("SignInPage", () => {
  beforeEach(() => {
    router.push.mockReset();
    router.refresh.mockReset();
    for (const mock of Object.values(requests)) mock.mockReset();
    search.next = "/reports";
    webAuthn.supported = false;
    vi.useFakeTimers({ toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("signs in and goes on to the page asked for", async () => {
    requests.signInWithPassword.mockResolvedValue("ok");
    const { user } = renderWithI18n(<SignInPage mode="login" googleEnabled={false} />);
    await user.type(screen.getByPlaceholderText("you@example.com"), "me@example.com");
    await user.type(screen.getByPlaceholderText("••••••••••"), "secret");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(requests.signInWithPassword).toHaveBeenCalledWith("me@example.com", "secret", "");
    expect(router.push).toHaveBeenCalledWith("/reports");
  });

  it("asks for a code when the account has two-step verification", async () => {
    requests.signInWithPassword.mockResolvedValue("two_factor");
    const { user } = renderWithI18n(<SignInPage mode="login" googleEnabled={false} />);
    await user.type(screen.getByPlaceholderText("you@example.com"), "me@example.com");
    await user.type(screen.getByPlaceholderText("••••••••••"), "secret");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByPlaceholderText("123 456")).toHaveFocus();
  });

  it("never leaves the app after signing in", async () => {
    search.next = "https://evil.example";
    requests.signInWithPassword.mockResolvedValue("ok");
    const { user } = renderWithI18n(<SignInPage mode="login" googleEnabled />);
    await user.type(screen.getByPlaceholderText("you@example.com"), "me@example.com");
    await user.type(screen.getByPlaceholderText("••••••••••"), "secret");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(router.push).toHaveBeenCalledWith("/");
  });

  it("shows why an account could not be created, in the page language", async () => {
    requests.registerAccount.mockResolvedValue("auth.problem.taken");
    const { user } = renderWithI18n(<SignInPage mode="register" googleEnabled={false} />);
    await user.type(screen.getByPlaceholderText("you@example.com"), "me@example.com");
    await user.type(screen.getByPlaceholderText("••••••••••"), "Long-enough-pass-42");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByText("There is already an account with that email. Try signing in.")).toBeInTheDocument();
  });

  it("names a wrong password and a server that cannot be reached", async () => {
    requests.signInWithPassword.mockResolvedValueOnce("failed").mockRejectedValueOnce(new Error("offline"));
    const { user } = renderWithI18n(<SignInPage mode="login" googleEnabled={false} />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Wrong email or password.");
    vi.setSystemTime(Date.now() + 500);
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByText("Could not reach the server.")).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("asks again for a wrong code and goes back to the account form", async () => {
    requests.signInWithPassword.mockResolvedValueOnce("two_factor").mockResolvedValueOnce("two_factor_wrong");
    const { user } = renderWithI18n(<SignInPage mode="login" googleEnabled />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.queryByRole("button", { name: "Continue with Google" })).not.toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("123 456"), "123456");
    vi.setSystemTime(Date.now() + 500);
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(requests.signInWithPassword).toHaveBeenLastCalledWith("me@example.com", "secret", "123456");
    expect(screen.getByText("That code did not work. Try the next one from the app.")).toBeInTheDocument();
    vi.setSystemTime(Date.now() + 500);
    await user.click(screen.getByRole("button", { name: "Use another account" }));
    expect(screen.getByPlaceholderText("you@example.com")).toHaveValue("me@example.com");
    expect(screen.queryByText(/That code did not work/u)).not.toBeInTheDocument();
  });

  it("says when a new account could not sign in", async () => {
    requests.registerAccount.mockResolvedValue(null);
    requests.signInWithPassword.mockResolvedValue("failed");
    const { user } = renderWithI18n(<SignInPage mode="register" googleEnabled={false} />);
    await user.type(screen.getByPlaceholderText("e.g. Alex"), "Me");
    await fill(user, "Long-enough-pass-42");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(requests.registerAccount).toHaveBeenCalledWith({
      email: "me@example.com",
      password: "Long-enough-pass-42",
      name: "Me",
    });
    expect(screen.getByText("The account was created, but signing in failed. Try again.")).toBeInTheDocument();
  });

  it("checks the email before sending anything", async () => {
    const { user } = renderWithI18n(<SignInPage mode="login" googleEnabled={false} />);
    await user.type(screen.getByPlaceholderText("you@example.com"), "nope");
    await user.tab();
    expect(screen.getByText("That email does not look right.")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("••••••••••"), "secret");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(requests.signInWithPassword).not.toHaveBeenCalled();
  });

  it("signs in with a passkey or Google", async () => {
    webAuthn.supported = true;
    requests.signInWithPasskey
      .mockResolvedValueOnce("cancelled")
      .mockResolvedValueOnce("failed")
      .mockResolvedValueOnce("ok");
    requests.signInWithGoogle.mockResolvedValue();
    const { user } = renderWithI18n(<SignInPage mode="login" googleEnabled />);
    const passkey = screen.getByRole("button", { name: "Sign in with a passkey" });
    await user.click(passkey);
    expect(screen.queryByText(/passkey was not accepted/u)).not.toBeInTheDocument();
    vi.setSystemTime(Date.now() + 500);
    await user.click(passkey);
    expect(screen.getByText("That passkey was not accepted. Use the password, or try again.")).toBeInTheDocument();
    vi.setSystemTime(Date.now() + 500);
    await user.click(passkey);
    expect(router.push).toHaveBeenCalledWith("/reports");
    await user.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(requests.signInWithGoogle).toHaveBeenCalledWith("/reports");
  });

  it("switches the language of the signed-out pages", async () => {
    const { user } = renderWithI18n(<SignInPage mode="login" googleEnabled={false} />);
    await user.click(screen.getByRole("button", { name: /^Language/u }));
    await user.click(screen.getByRole("option", { name: /Українська/u }));
    expect(document.cookie).toContain("finance-locale=uk");
    expect(router.refresh).toHaveBeenCalledOnce();
  });
});
