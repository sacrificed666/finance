import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithI18n } from "@/test/render";

import CardLink from "./CardLink";

describe("CardLink", () => {
  it("names the page it opens", () => {
    renderWithI18n(<CardLink href="/accounts" />);
    expect(screen.getByRole("link", { name: "Accounts" })).toHaveAttribute("href", "/accounts");
  });

  it("says All for a place that is not a page of its own", () => {
    renderWithI18n(<CardLink href="/accounts#goals" />);
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute("href", "/accounts#goals");
  });

  it("takes its own label", () => {
    renderWithI18n(<CardLink href="/profile" label="Your profile" />);
    expect(screen.getByRole("link", { name: "Your profile" })).toHaveAttribute("href", "/profile");
  });

  it("speaks the page language", () => {
    renderWithI18n(<CardLink href="/accounts" />, "uk");
    expect(screen.getByRole("link")).toHaveTextContent("Рахунки");
  });
});
