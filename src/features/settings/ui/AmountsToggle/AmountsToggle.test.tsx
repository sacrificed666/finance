import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { setHiddenAmounts } from "@/features/settings/model/hiddenAmounts";
import { renderWithI18n } from "@/test/render";

import AmountsToggle from "./AmountsToggle";

describe("AmountsToggle", () => {
  afterEach(() => {
    setHiddenAmounts(false);
    localStorage.clear();
  });

  it("hides amounts on this device and shows them again", async () => {
    const user = userEvent.setup();
    renderWithI18n(<AmountsToggle />);
    await user.click(screen.getByRole("button", { name: "Hide amounts" }));
    const pressed = screen.getByRole("button", { name: "Show amounts" });
    expect(pressed).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem("finance:view:hiddenAmounts")).toBe("true");
    await user.click(pressed);
    expect(screen.getByRole("button", { name: "Hide amounts" })).toHaveAttribute("aria-pressed", "false");
  });
});
