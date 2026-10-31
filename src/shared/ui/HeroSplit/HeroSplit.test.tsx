import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HeroSplit from "./HeroSplit";

const SEGMENTS = [
  { id: "card", label: "Card", value: 300, colorSlot: 1, icon: "💳" },
  { id: "cash", label: "Cash", value: 100, colorSlot: 2 },
  { id: "empty", label: "Empty", value: 0, colorSlot: 3 },
];

describe("HeroSplit", () => {
  it("splits the bar and lists every part with its share and amount", () => {
    render(<HeroSplit title="Made of" summary="2 kinds" segments={SEGMENTS} currency="UAH" />);
    expect(screen.getByRole("figure", { name: "Made of" })).toBeInTheDocument();
    expect(screen.getByText("Card")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("100 ₴")).toBeInTheDocument();
    expect(screen.queryByText("Empty")).not.toBeInTheDocument();
    expect(screen.getByText("💳")).toHaveAttribute("aria-hidden", "true");
  });

  it("puts three parts side by side", () => {
    const { container } = render(<HeroSplit title="Accounts" segments={SEGMENTS} currency="UAH" columns={3} />);
    expect(container.querySelector("ul")?.className).toMatch(/three/u);
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("shows nothing when every part is empty", () => {
    const { container } = render(<HeroSplit title="Empty" segments={[SEGMENTS[2]!]} currency="UAH" />);
    expect(container.firstChild).toBeNull();
  });
});
