import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import { gamification } from "@/features/profile/model/achievements";
import type { Profile } from "@/features/profile/model/profileFields";
import { renderWithI18n } from "@/test/render";

import ProfileHero from "./ProfileHero";

const profile: Profile = {
  id: "u",
  email: "me@example.com",
  emailVerified: null,
  name: "",
  image: null,
  about: "Saving for a boat",
  occupation: "Designer",
  location: null,
  website: "https://example.com",
  birthday: null,
  createdAt: "2026-01-01",
  hasPassword: true,
  providers: [],
  twoFactor: false,
  recoveryLeft: 0,
  passkeys: 0,
};

describe("ProfileHero", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows who the account is with an initial for a missing picture", () => {
    renderWithI18n(<ProfileHero profile={profile} g={gamification(DEFAULT_STATE)} onEdit={vi.fn<() => void>()} />);
    expect(screen.getByText("M")).toBeInTheDocument();
    expect(screen.getByText("Designer")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /example\.com/u })).toHaveAttribute("href", "https://example.com");
    expect(screen.getByText("Saving for a boat")).toBeInTheDocument();
    expect(screen.getByText("Newcomer")).toBeInTheDocument();
    expect(screen.getByText("0/30")).toBeInTheDocument();
    expect(screen.queryByText(/\/100$/u)).not.toBeInTheDocument();
  });

  it("names an account without a name after its address and opens the editing", async () => {
    const onEdit = vi.fn<() => void>();
    vi.useRealTimers();
    const { user } = renderWithI18n(
      <ProfileHero
        profile={{ ...profile, name: null, email: "olena@example.com" }}
        g={gamification(DEFAULT_STATE)}
        onEdit={onEdit}
      />,
    );
    expect(screen.getByText("Olena")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit profile" }));
    expect(onEdit).toHaveBeenCalledOnce();
  });
});
