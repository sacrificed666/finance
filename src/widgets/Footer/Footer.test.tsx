import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithI18n } from "@/test/render";

import Footer from "./Footer";

describe("Footer", () => {
  it("credits the prices and the author and shows the version", () => {
    renderWithI18n(<Footer />);
    expect(screen.getByRole("link", { name: /^CoinGecko/u })).toHaveAttribute("href", "https://www.coingecko.com");
    expect(screen.getByRole("link", { name: /^Source code/u })).toHaveAttribute(
      "href",
      "https://github.com/sacrificed666/finance",
    );
    expect(screen.getByRole("link", { name: /^v1\.0\.0/u })).toHaveAttribute(
      "href",
      "https://github.com/sacrificed666/finance/blob/main/CHANGELOG.md",
    );
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(
      screen.getByText(`© ${String(new Date().getFullYear())} Illia Movchko`, { exact: false }),
    ).toBeInTheDocument();
  });

  it("tells screen readers that the links open a new tab", () => {
    renderWithI18n(<Footer />, "uk");
    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveTextContent("(відкривається в новій вкладці)");
    }
  });
});
