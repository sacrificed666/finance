import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithI18n } from "@/test/render";

import ExternalLink from "./ExternalLink";

describe("ExternalLink", () => {
  it("opens another site in a new tab and says so", () => {
    renderWithI18n(<ExternalLink href="https://www.coingecko.com">CoinGecko</ExternalLink>);
    const link = screen.getByRole("link", { name: /^CoinGecko ?\(opens in a new tab\)$/u });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link.querySelector("svg")).toBeInTheDocument();
  });

  it("uses the given label, adds context and leaves out the arrow on request", () => {
    renderWithI18n(
      <ExternalLink href="https://example.com" label="Source code" context="GitHub" icon={false}>
        Code
      </ExternalLink>,
      "uk",
    );
    const link = screen.getByRole("link", { name: "Source code (відкривається в новій вкладці)" });
    expect(link).toHaveTextContent("Code, GitHub");
    expect(link.querySelector("svg")).not.toBeInTheDocument();
  });
});
