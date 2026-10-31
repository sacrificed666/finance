import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { changePassword, endAllSessions } from "@/features/profile/api/profile";
import type { leave, linkGoogle } from "@/features/profile/api/session";
import type { Profile } from "@/features/profile/model/profileFields";
import { renderWithI18n } from "@/test/render";

import SignInCard from "./SignInCard";

const session = vi.hoisted(() => ({ linkGoogle: vi.fn<typeof linkGoogle>(), leave: vi.fn<typeof leave>() }));
const requests = vi.hoisted(() => ({
  changePassword: vi.fn<typeof changePassword>(),
  endAllSessions: vi.fn<typeof endAllSessions>(),
}));

vi.mock(import("@/features/profile/api/session"), () => session);
vi.mock("@/features/profile/ui/PasskeysSheet/PasskeysSheet", () => ({
  default: ({ onCount, onClose }: { onCount: (count: number) => void; onClose: () => void }) => (
    <dialog open aria-label="Passkeys">
      <button type="button" onClick={() => onCount(3)}>
        Count
      </button>
      <button type="button" onClick={onClose}>
        Close
      </button>
    </dialog>
  ),
}));
vi.mock("@/features/profile/ui/TwoFactorSheet/TwoFactorSheet", () => ({
  default: ({
    mode,
    onDone,
    onClose,
  }: {
    mode: string;
    onDone: (on: boolean, left: number) => void;
    onClose: () => void;
  }) => (
    <dialog open aria-label={`Two-step ${mode}`}>
      <button type="button" onClick={() => onDone(mode === "enable", 8)}>
        Finish
      </button>
      <button type="button" onClick={onClose}>
        Close
      </button>
    </dialog>
  ),
}));
vi.mock(import("@/features/profile/api/profile"), async (importOriginal) => ({
  ...(await importOriginal()),
  ...requests,
}));

const profile: Profile = {
  id: "u",
  email: "me@example.com",
  emailVerified: "2026-01-01T00:00:00Z",
  name: "Me",
  image: null,
  about: null,
  occupation: null,
  location: null,
  website: null,
  birthday: null,
  createdAt: "2026-01-01",
  hasPassword: false,
  providers: [],
  twoFactor: false,
  recoveryLeft: 0,
  passkeys: 0,
  googleAvailable: true,
};

// An account with every way in already set up
const secured: Profile = {
  ...profile,
  hasPassword: true,
  providers: ["google"],
  passkeys: 2,
  twoFactor: true,
  recoveryLeft: 5,
};

describe("SignInCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    requests.changePassword.mockReset();
    requests.endAllSessions.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists the ways in and offers to link Google", async () => {
    const { user } = renderWithI18n(
      <SignInCard profile={profile} onChange={vi.fn<(patch: Partial<Profile>) => void>()} />,
    );
    expect(screen.getByText("Not set: Google sign-in only · email verified")).toBeInTheDocument();
    expect(screen.queryByText("Two-step verification")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Link" }));
    expect(session.linkGoogle).toHaveBeenCalledOnce();
  });

  it("leaves Google out where the server cannot link it", () => {
    renderWithI18n(
      <SignInCard
        profile={{ ...profile, googleAvailable: false }}
        onChange={vi.fn<(patch: Partial<Profile>) => void>()}
      />,
    );
    expect(screen.queryByText("Google")).not.toBeInTheDocument();
  });

  it("sets a first password", async () => {
    requests.changePassword.mockResolvedValue({ ok: true, data: null });
    const onChange = vi.fn<(patch: Partial<Profile>) => void>();
    const { user } = renderWithI18n(<SignInCard profile={profile} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Set password" }));
    const [first, second] = screen.getAllByLabelText(/password/iu, { selector: "input" });
    await user.type(first ?? document.body, "Long-enough-pass-42");
    await user.type(second ?? document.body, "Long-enough-pass-42");
    await user.click(screen.getAllByRole("button", { name: "Set password" }).at(-1) ?? document.body);
    expect(requests.changePassword).toHaveBeenCalledWith("", "Long-enough-pass-42");
    expect(onChange).toHaveBeenCalledWith({ hasPassword: true });
  });

  it("ends every session after asking", async () => {
    requests.endAllSessions.mockResolvedValue(true);
    const { user } = renderWithI18n(
      <SignInCard profile={profile} onChange={vi.fn<(patch: Partial<Profile>) => void>()} />,
    );
    await user.click(screen.getByRole("button", { name: "Sign out everywhere" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Sign out everywhere" }));
    await vi.waitFor(() => expect(session.leave).toHaveBeenCalledOnce());
  });

  it("shows an account with every way in and manages passkeys and two-step sign-in", async () => {
    const onChange = vi.fn<(patch: Partial<Profile>) => void>();
    const { user } = renderWithI18n(<SignInCard profile={secured} onChange={onChange} />);
    expect(screen.getByText("2 passkeys")).toBeInTheDocument();
    expect(screen.getByText("On · 5 recovery codes")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Link" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Manage" }));
    await user.click(within(screen.getByRole("dialog", { name: "Passkeys" })).getByRole("button", { name: "Count" }));
    expect(onChange).toHaveBeenCalledWith({ passkeys: 3 });
    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Turn off" }));
    await user.click(
      within(screen.getByRole("dialog", { name: "Two-step disable" })).getByRole("button", { name: "Finish" }),
    );
    expect(onChange).toHaveBeenCalledWith({ twoFactor: false, recoveryLeft: 8 });
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("offers to turn two-step sign-in on and passkeys to add", async () => {
    const { user } = renderWithI18n(
      <SignInCard profile={{ ...profile, hasPassword: true }} onChange={vi.fn<(patch: Partial<Profile>) => void>()} />,
    );
    expect(screen.getByRole("button", { name: "Add a passkey" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Turn on" }));
    expect(screen.getByRole("dialog", { name: "Two-step enable" })).toBeInTheDocument();
  });

  it("names a refused password and lets the form go", async () => {
    requests.changePassword.mockResolvedValue({ ok: false, error: "password.problem.current" });
    const { user } = renderWithI18n(
      <SignInCard profile={secured} onChange={vi.fn<(patch: Partial<Profile>) => void>()} />,
    );
    await user.click(screen.getByRole("button", { name: "Change password" }));
    const [current, next, repeat] = screen.getAllByLabelText(/password|repeat/iu, { selector: "input" });
    await user.type(current!, "guess");
    await user.type(next!, "Long-enough-pass-42");
    await user.type(repeat!, "Long-enough-pass-42");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("That is not your current password.")).toBeInTheDocument();
    vi.setSystemTime(Date.now() + 500);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Change password" })).toBeInTheDocument();
  });

  it("says when the other devices could not be signed out and signs out here", async () => {
    requests.endAllSessions.mockResolvedValue(false);
    const { user } = renderWithI18n(
      <SignInCard profile={profile} onChange={vi.fn<(patch: Partial<Profile>) => void>()} />,
    );
    await user.click(screen.getByRole("button", { name: "Sign out everywhere" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Sign out everywhere" }));
    expect(await screen.findByText("Could not sign out the other devices.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(session.leave).toHaveBeenCalled();
  });
});
