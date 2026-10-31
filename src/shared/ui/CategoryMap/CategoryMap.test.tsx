import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithI18n } from "@/test/render";

import CategoryMap from "./CategoryMap";

const SEGMENTS = [
  { id: "home", label: "Housing", icon: "🏠", value: 8000, colorSlot: 1 },
  { id: "food", label: "Food", icon: "🍽️", value: 1500, colorSlot: 2 },
  { id: "fun", label: "Fun", icon: "🎉", value: 500, colorSlot: 3 },
];

describe("CategoryMap", () => {
  it("draws a tile per category, as large as its share, with the figures for screen readers", () => {
    const { container } = renderWithI18n(<CategoryMap segments={SEGMENTS} currency="UAH" />);
    const cells = container.querySelectorAll("[title]");
    expect([...cells].map((cell) => cell.getAttribute("title")?.replaceAll("\u00a0", " "))).toEqual([
      "Housing: 8,000 ₴",
      "Food: 1,500 ₴",
      "Fun: 500 ₴",
    ]);
    expect(screen.getByRole("table", { name: "Breakdown by category" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Housing" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "80%" })).toBeInTheDocument();
  });

  it("names a large tile in full, a small one by its figure and leaves a tiny one bare", () => {
    const tiny = { id: "gift", label: "Gifts", icon: "🎁", value: 40, colorSlot: 4 };
    const { container } = renderWithI18n(<CategoryMap segments={[...SEGMENTS, tiny]} currency="UAH" />);
    const [home, , fun, gift] = [...container.querySelectorAll("[title]")].map((cell) =>
      cell.textContent.replaceAll("\u00a0", " "),
    );
    expect(home).toBe("🏠Housing80%8,000 ₴");
    expect(fun).toBe("🎉500 ₴");
    expect(gift).toBe("");
  });

  it("turns the tiles into toggles that fade the others while one is chosen", async () => {
    const onChoose = vi.fn<(id: string) => void>();
    const { user, rerender } = renderWithI18n(<CategoryMap segments={SEGMENTS} currency="UAH" onChoose={onChoose} />);
    const food = screen.getByRole("button", { name: /^Food: 1,500/u });
    expect(food).toHaveAttribute("aria-pressed", "false");
    await user.click(food);
    expect(onChoose).toHaveBeenCalledWith("food");
    rerender(<CategoryMap segments={SEGMENTS} currency="UAH" chosen="food" onChoose={onChoose} />);
    expect(screen.getByRole("button", { name: /^Food/u })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /^Housing/u }).className).toMatch(/faded/u);
    expect(screen.getByRole("button", { name: /^Food/u }).className).not.toMatch(/faded/u);
  });

  it("turns the tiles into links when given where each leads", () => {
    renderWithI18n(<CategoryMap segments={SEGMENTS} currency="UAH" hrefOf={(id) => `/spent/${id}`} />);
    expect(screen.getByRole("link", { name: /^Food: 1,500/u })).toHaveAttribute("href", "/spent/food");
  });

  it("draws nothing without spending", () => {
    const { container } = renderWithI18n(<CategoryMap segments={[]} currency="UAH" />);
    expect(container).toBeEmptyDOMElement();
  });
});
