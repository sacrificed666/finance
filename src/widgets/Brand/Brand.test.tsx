import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import { renderWithStore } from "@/test/render";

import Brand from "./Brand";

const STATE = {
  ...DEFAULT_STATE,
  savings: [
    { id: "card", name: "Card", icon: "💳", kind: "card" as const, currency: "UAH" as const, openingBalance: 506_568 },
  ],
};

describe("Brand", () => {
  it("links to the dashboard with the name and today's net worth", () => {
    renderWithStore(<Brand />, { state: STATE });
    const link = screen.getByRole("link", { name: /^Finances\s*506\.6K\u00A0₴, Dashboard$/u });
    expect(link).toHaveAttribute("href", "/");
    expect(link).toHaveTextContent("Finances");
    expect(link).toHaveTextContent("506.6K ₴");
  });

  it("marks the logo while a change saves or after a save failed", () => {
    const { container, unmount } = renderWithStore(<Brand />, { sync: { sync: "saving" } });
    expect(container.querySelector("[title]")?.className).toMatch(/saving/u);
    unmount();
    const failed = renderWithStore(<Brand />, { sync: { sync: "error" } });
    expect(failed.container.querySelector("[title]")?.className).toMatch(/failed/u);
  });
});
