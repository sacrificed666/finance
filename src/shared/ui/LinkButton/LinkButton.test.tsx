import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import LinkButton from "./LinkButton";

describe("LinkButton", () => {
  it("links to the page with the look of a button", () => {
    render(<LinkButton href="/accounts">Open accounts</LinkButton>);
    expect(screen.getByRole("link", { name: "Open accounts" })).toHaveAttribute("href", "/accounts");
  });

  it("can be the quiet one beside the main action", () => {
    render(
      <LinkButton href="/income" variant="ghost">
        Log income
      </LinkButton>,
    );
    expect(screen.getByRole("link", { name: "Log income" }).className).toMatch(/ghost/u);
  });

  it("opens another app's address as a plain small link", () => {
    render(
      <LinkButton href="webcal://example.com/feed.ics" variant="ghost" size="sm">
        Open in Calendar
      </LinkButton>,
    );
    const link = screen.getByRole("link", { name: "Open in Calendar" });
    expect(link).toHaveAttribute("href", "webcal://example.com/feed.ics");
    expect(link.className).toMatch(/sm/u);
  });
});
