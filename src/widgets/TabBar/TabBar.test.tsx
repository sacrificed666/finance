import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithI18n } from "@/test/render";

import TabBar from "./TabBar";

const nav = vi.hoisted(() => ({ pathname: "/transactions", push: vi.fn<(href: string) => void>() }));

vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname, useRouter: () => ({ push: nav.push }) }));

describe("TabBar", () => {
  it("shows the main pages by their short names, marks the open one and adds an expense", async () => {
    nav.pathname = "/transactions";
    const { user } = renderWithI18n(<TabBar />);
    expect(screen.getByRole("link", { name: "Spend" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Accounts" })).toHaveAttribute("href", "/accounts");
    expect(screen.queryByRole("link", { name: "Calendar" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add an expense" }));
    expect(nav.push).toHaveBeenCalledWith("/transactions?add=expense", { scroll: false });
  });

  it("opens the other pages behind More and closes when one is chosen", async () => {
    nav.pathname = "/calendar";
    const { user } = renderWithI18n(<TabBar />);
    const more = screen.getByRole("button", { name: "More" });
    await user.click(more);
    const calendar = screen.getByRole("link", { name: "Calendar" });
    expect(calendar).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
    calendar.addEventListener("click", (event) => event.preventDefault());
    await user.click(calendar);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
