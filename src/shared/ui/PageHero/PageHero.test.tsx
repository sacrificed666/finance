import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PageHero from "./PageHero";

const STATS = [
  { label: "Income", icon: "arrowDown" as const, value: "62K ₴", tone: "income" as const, href: "/income" },
  {
    label: "Expenses",
    value: "20.1K ₴",
    tone: "expense" as const,
    delta: { text: "-4,880 ₴", good: true },
    hint: "so far",
  },
  { label: "Saved", value: "67.5%", hint: "on average" },
];

describe("PageHero", () => {
  it("shows the headline figure with its other forms, change and note", () => {
    const { container } = render(
      <PageHero
        label="Net worth"
        icon="wallet"
        action={<button type="button">UAH</button>}
        value="506,568 ₴"
        sub="$12,295.34"
        delta={{ text: "+47.1K ₴ in a month", good: true }}
        note="86K ₴ of debt subtracted"
        aside={<p>Trend</p>}
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Net worth" })).toBeInTheDocument();
    expect(screen.getByText("506,568 ₴")).toBeInTheDocument();
    expect(screen.getByText("+47.1K ₴ in a month").className).toMatch(/income/u);
    expect(screen.getByText("86K ₴ of debt subtracted")).toBeInTheDocument();
    expect(screen.getByText("Trend")).toBeInTheDocument();
    expect(container.querySelector("[class*='withAside']")).toBeInTheDocument();
  });

  it("lists the figures under the headline, linking those with a page", () => {
    render(<PageHero value="1" stats={STATS} />);
    expect(screen.getByRole("link", { name: /Income/u })).toHaveAttribute("href", "/income");
    expect(screen.getByText("-4,880 ₴").className).toMatch(/income/u);
    expect(screen.getByText("so far").className).toMatch(/statHintClose/u);
    const items = screen.getAllByRole("listitem");
    expect(items[2]?.className).toMatch(/wideStat/u);
    expect(screen.getByRole("list").className).toMatch(/three/u);
  });

  it("takes its own lead and four figures", () => {
    render(
      <PageHero
        label="Profile"
        delta={{ text: "-1", good: false }}
        lead={<p>Avatar</p>}
        stats={[...STATS, { label: "Rate", value: "1%" }]}
      />,
    );
    expect(screen.getByText("Avatar")).toBeInTheDocument();
    expect(screen.queryByText("-1")).not.toBeInTheDocument();
    expect(screen.getByRole("list").className).toMatch(/four/u);
  });

  it("pairs two figures and gives a lone one the whole row", () => {
    const { rerender } = render(<PageHero value="1" stats={STATS.slice(0, 2)} />);
    expect(screen.getByRole("list").className).not.toMatch(/three|four|one/u);
    rerender(<PageHero value="1" stats={STATS.slice(0, 1)} />);
    expect(screen.getByRole("list").className).toMatch(/one/u);
  });

  it("has no header row without a label or an action", () => {
    const { container } = render(<PageHero value="0 ₴" delta={{ text: "-5 ₴", good: false }} />);
    expect(container.querySelector("h2")).toBeNull();
    expect(screen.getByText("-5 ₴").className).toMatch(/expense/u);
  });
});
