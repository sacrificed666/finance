import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithStore } from "@/test/render";

import ProgressCard from "./ProgressCard";

describe("ProgressCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:00:00"), toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the level, the health grade and the next achievement", () => {
    renderWithStore(<ProgressCard />);
    expect(screen.getByText("Level")).toBeInTheDocument();
    expect(screen.getByText("Newcomer")).toBeInTheDocument();
    expect(screen.getByText("Health")).toBeInTheDocument();
    expect(screen.getByText(/XP to level 2/u)).toBeInTheDocument();
    expect(screen.getByText(/^Next: /u)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Profile/u })).toHaveAttribute("href", "/profile");
  });
});
