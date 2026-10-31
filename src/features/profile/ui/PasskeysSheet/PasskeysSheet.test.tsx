import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { fetchPasskeys, registrationOptions, removePasskey, savePasskey } from "@/features/profile/api/passkeys";
import { renderWithI18n } from "@/test/render";

import PasskeysSheet from "./PasskeysSheet";

const requests = vi.hoisted(() => ({
  fetchPasskeys: vi.fn<typeof fetchPasskeys>(),
  registrationOptions: vi.fn<typeof registrationOptions>(),
  savePasskey: vi.fn<typeof savePasskey>(),
  removePasskey: vi.fn<typeof removePasskey>(),
}));
const browser = vi.hoisted(() => ({
  browserSupportsWebAuthn: vi.fn<() => boolean>(() => true),
  startRegistration: vi.fn<() => Promise<never>>(),
}));

vi.mock(import("@/features/profile/api/passkeys"), async (importOriginal) => ({
  ...(await importOriginal()),
  ...requests,
}));
vi.mock(import("@simplewebauthn/browser"), async (importOriginal) => ({ ...(await importOriginal()), ...browser }));

const key = { id: "k", name: "Mac", createdAt: "2026-10-01T00:00:00Z", lastUsedAt: null };

// The sheet with spies for its callbacks
const renderSheet = () => {
  const onCount = vi.fn<(count: number) => void>();
  return { onCount, ...renderWithI18n(<PasskeysSheet onCount={onCount} onClose={vi.fn<() => void>()} />) };
};

describe("PasskeysSheet", () => {
  it("removes a passkey after a second click", async () => {
    requests.fetchPasskeys.mockResolvedValue([key]);
    requests.removePasskey.mockResolvedValue([]);
    const { user, onCount } = renderSheet();
    await user.click(await screen.findByRole("button", { name: "Remove Mac" }));
    await user.click(screen.getByRole("button", { name: /Remove/u }));
    expect(requests.removePasskey).toHaveBeenCalledWith("k");
    expect(onCount).toHaveBeenCalledWith(0);
  });

  it("says when adding a passkey was cancelled", async () => {
    requests.fetchPasskeys.mockResolvedValue([]);
    requests.registrationOptions.mockResolvedValue({
      challenge: "c",
      rp: { name: "Finances" },
      user: { id: "u", name: "me", displayName: "Me" },
      pubKeyCredParams: [],
    });
    browser.startRegistration.mockRejectedValue(Object.assign(new Error("no"), { name: "NotAllowedError" }));
    const { user } = renderSheet();
    await user.click(screen.getByRole("button", { name: "Add a passkey" }));
    expect(await screen.findByText(/cancel/iu)).toBeInTheDocument();
  });
});
