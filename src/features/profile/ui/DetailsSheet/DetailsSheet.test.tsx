import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { saveDetails } from "@/features/profile/api/profile";
import type { Profile } from "@/features/profile/model/profileFields";
import { renderWithI18n } from "@/test/render";

import DetailsSheet from "./DetailsSheet";

const save = vi.hoisted(() => vi.fn<typeof saveDetails>());

vi.mock(import("@/features/profile/api/profile"), async (importOriginal) => ({
  ...(await importOriginal()),
  saveDetails: save,
}));

const profile: Profile = {
  id: "u",
  email: "me@example.com",
  emailVerified: null,
  name: "Me",
  image: null,
  about: null,
  occupation: null,
  location: null,
  website: null,
  birthday: null,
  createdAt: "2026-01-01",
  hasPassword: true,
  providers: [],
  twoFactor: false,
  recoveryLeft: 0,
  passkeys: 0,
};

describe("DetailsSheet", () => {
  it("saves changed details, hands the stored profile back and closes", async () => {
    save.mockResolvedValue({ ok: true, data: { ...profile, occupation: "Designer" } });
    const onSaved = vi.fn<(saved: Profile) => void>();
    const onClose = vi.fn<() => void>();
    const { user } = renderWithI18n(<DetailsSheet profile={profile} onSaved={onSaved} onClose={onClose} />);
    const submit = screen.getByRole("button", { name: "Save changes" });
    expect(submit).toBeDisabled();
    expect(screen.getByPlaceholderText("e.g. Alex")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: /^What you do/u }), "Designer");
    await user.click(submit);
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ occupation: "Designer" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows the server's reason and stays open", async () => {
    save.mockResolvedValue({ ok: false, error: "profile.problem.websiteLong" });
    const onClose = vi.fn<() => void>();
    const { user } = renderWithI18n(
      <DetailsSheet profile={profile} onSaved={vi.fn<(saved: Profile) => void>()} onClose={onClose} />,
    );
    await user.type(screen.getByRole("textbox", { name: /^Where you are/u }), "Kyiv");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByText("That link is too long.")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
