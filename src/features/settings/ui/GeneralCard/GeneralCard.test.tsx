import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SHORTCUTS_KEY } from "@/features/commands/model/useShortcuts";
import { renderWithStore } from "@/test/render";

import GeneralCard from "./GeneralCard";

describe("GeneralCard", () => {
  it("switches the base currency and the theme", async () => {
    const { user, probe } = renderWithStore(<GeneralCard />);
    await user.click(screen.getByRole("radio", { name: "EUR" }));
    await user.click(screen.getByRole("radio", { name: "Light" }));
    expect(probe.state.settings).toMatchObject({ baseCurrency: "EUR", theme: "light" });
  });

  it("turns the keyboard shortcuts off for this device", async () => {
    const { user } = renderWithStore(<GeneralCard />);
    const toggle = screen.getByRole("switch", { name: "Keyboard shortcuts" });
    expect(toggle).toBeChecked();
    await user.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(localStorage.getItem(`finance:view:${SHORTCUTS_KEY}`)).toBe("false");
  });
});
