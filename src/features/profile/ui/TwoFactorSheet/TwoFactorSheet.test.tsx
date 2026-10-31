import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { beginTwoFactor, sendTwoFactor } from "@/features/profile/api/twoFactor";
import type { downloadFile } from "@/shared/lib/download";
import { renderWithI18n } from "@/test/render";

import TwoFactorSheet from "./TwoFactorSheet";

const requests = vi.hoisted(() => ({
  beginTwoFactor: vi.fn<typeof beginTwoFactor>(),
  sendTwoFactor: vi.fn<typeof sendTwoFactor>(),
}));

const download = vi.hoisted(() => vi.fn<typeof downloadFile>());

vi.mock(import("@/features/profile/api/twoFactor"), async (importOriginal) => ({
  ...(await importOriginal()),
  ...requests,
}));
vi.mock(import("@/shared/lib/download"), async (importOriginal) => ({
  ...(await importOriginal()),
  downloadFile: download,
}));

describe("TwoFactorSheet", () => {
  beforeEach(() => {
    requests.beginTwoFactor.mockReset();
    requests.sendTwoFactor.mockReset();
  });

  it("shows the key, confirms a code and gives the recovery codes", async () => {
    requests.beginTwoFactor.mockResolvedValue({ secret: "ABCDEFGH", uri: "otpauth://totp/x" });
    requests.sendTwoFactor.mockResolvedValue({ ok: true, recovery: ["a-1", "b-2"] });
    const onDone = vi.fn<(enabled: boolean, left: number) => void>();
    const { user } = renderWithI18n(
      <TwoFactorSheet mode="enable" email="me@example.com" onDone={onDone} onClose={vi.fn<() => void>()} />,
    );
    expect(await screen.findByText("ABCD EFGH")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("123 456"), "123456");
    await user.click(screen.getByRole("button", { name: "Turn on" }));
    expect(onDone).toHaveBeenCalledWith(true, 2);
    expect(screen.getByText("a-1")).toBeInTheDocument();
  });

  it("says when a code to turn it off is wrong", async () => {
    requests.sendTwoFactor.mockResolvedValue({ ok: false, reason: "wrong" });
    const { user } = renderWithI18n(
      <TwoFactorSheet
        mode="disable"
        email={null}
        onDone={vi.fn<(enabled: boolean, left: number) => void>()}
        onClose={vi.fn<() => void>()}
      />,
    );
    await user.type(screen.getByPlaceholderText("123 456"), "000000");
    await user.click(screen.getByRole("button", { name: "Turn off" }));
    expect(requests.sendTwoFactor).toHaveBeenCalledWith("disable", "000000");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("copies and downloads the recovery codes", async () => {
    requests.beginTwoFactor.mockResolvedValue({ secret: "ABCDEFGH", uri: "otpauth://totp/x" });
    requests.sendTwoFactor.mockResolvedValue({ ok: true, recovery: ["a-1", "b-2"] });
    const onClose = vi.fn<() => void>();
    const { user } = renderWithI18n(
      <TwoFactorSheet
        mode="enable"
        email="me@example.com"
        onDone={vi.fn<(enabled: boolean, left: number) => void>()}
        onClose={onClose}
      />,
    );
    await user.type(await screen.findByPlaceholderText("123 456"), "123456");
    await user.click(screen.getByRole("button", { name: "Turn on" }));
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
    await expect(navigator.clipboard.readText()).resolves.toContain("me@example.com\n\na-1\nb-2");
    await user.click(screen.getByRole("button", { name: "Download .txt" }));
    expect(download).toHaveBeenCalledWith(
      "finances-recovery-codes.txt",
      expect.stringContaining("a-1"),
      "text/plain;charset=utf-8",
    );
    await user.click(screen.getByRole("button", { name: "I have saved them" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("says when the setup cannot start and ignores a late answer", async () => {
    requests.beginTwoFactor.mockResolvedValueOnce(null);
    renderWithI18n(
      <TwoFactorSheet
        mode="enable"
        email={null}
        onDone={vi.fn<(enabled: boolean, left: number) => void>()}
        onClose={vi.fn<() => void>()}
      />,
    );
    expect(await screen.findByText("Could not reach the server.")).toBeInTheDocument();
    const late = Promise.withResolvers<{ secret: string; uri: string } | null>();
    requests.beginTwoFactor.mockReturnValueOnce(late.promise);
    const view = renderWithI18n(
      <TwoFactorSheet
        mode="enable"
        email={null}
        onDone={vi.fn<(enabled: boolean, left: number) => void>()}
        onClose={vi.fn<() => void>()}
      />,
    );
    view.unmount();
    late.resolve({ secret: "X", uri: "otpauth://totp/y" });
    await expect(late.promise).resolves.toBeDefined();
  });

  it("turns two-step verification off with a code", async () => {
    requests.sendTwoFactor.mockResolvedValue({ ok: true, recovery: [] });
    const onDone = vi.fn<(enabled: boolean, left: number) => void>();
    const onClose = vi.fn<() => void>();
    const { user } = renderWithI18n(<TwoFactorSheet mode="disable" email={null} onDone={onDone} onClose={onClose} />);
    expect(screen.getByRole("dialog", { name: "Turn off two-step verification" })).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("123 456"), "abc-123");
    await user.click(screen.getByRole("button", { name: "Turn off" }));
    expect(onDone).toHaveBeenCalledWith(false, 0);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
