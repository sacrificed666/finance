import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { fetchProfile, fetchSignIns } from "@/features/profile/api/profile";
import { renderWithStore } from "@/test/render";

import ProfilePage from "./ProfilePage";

const requests = vi.hoisted(() => ({
  fetchProfile: vi.fn<typeof fetchProfile>(),
  fetchSignIns: vi.fn<typeof fetchSignIns>(() => Promise.resolve(null)),
}));

vi.mock(import("@/features/profile/api/profile"), async (importOriginal) => ({
  ...(await importOriginal()),
  ...requests,
}));

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("says when the profile could not be loaded", async () => {
    requests.fetchProfile.mockResolvedValue(null);
    renderWithStore(<ProfilePage />);
    expect(await screen.findByText(/could not/iu)).toBeInTheDocument();
  });

  it("shows the profile once it is in", async () => {
    requests.fetchProfile.mockResolvedValue({
      id: "u",
      email: "me@example.com",
      emailVerified: null,
      name: "Illia",
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
    });
    renderWithStore(<ProfilePage />);
    expect(await screen.findByText("Illia")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Achievements" })).toBeInTheDocument();
  });
});
