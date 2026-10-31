import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Card from "./Card";

describe("Card", () => {
  it("shows its icon, title, subtitle, action, content and footer", () => {
    const { container } = render(
      <Card
        title="Accounts"
        subtitle="All of them"
        icon="wallet"
        action={<button type="button">Add</button>}
        footer="Updated today"
        className="extra"
      >
        <p>Body</p>
      </Card>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Accounts" })).toBeInTheDocument();
    expect(screen.getByText("All of them")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("Updated today")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("extra");
  });

  it("has no header row when there is nothing to put in it", () => {
    const { container } = render(
      <Card action={false} title="">
        <p>Only content</p>
      </Card>,
    );
    const section = container.firstElementChild;
    expect(section?.children).toHaveLength(1);
  });

  it("glows when it is the page's headline block", () => {
    const { container } = render(
      <Card glow>
        <p>Net worth</p>
      </Card>,
    );
    expect(container.firstElementChild?.className).toMatch(/glow/u);
  });

  it("puts its icon in a disc tinted by its subject, hidden from screen readers", () => {
    const { container } = render(
      <Card icon="chart" title="Chart">
        <p>Body</p>
      </Card>,
    );
    const disc = container.querySelector("h2")?.parentElement?.previousElementSibling;
    expect(disc).toHaveAttribute("aria-hidden", "true");
    expect(disc?.querySelector("svg")).toBeInTheDocument();
    expect(disc?.getAttribute("style")).toMatch(/--series-1/u);
  });

  it("keeps an icon without a subject colour in plain glass", () => {
    const { container } = render(
      <Card icon="home" title="Home">
        <p>Body</p>
      </Card>,
    );
    const disc = container.querySelector("h2")?.parentElement?.previousElementSibling;
    expect(disc?.className).toMatch(/plain/u);
    expect(disc?.getAttribute("style")).toBeNull();
  });
});
