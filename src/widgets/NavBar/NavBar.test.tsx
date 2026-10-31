import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithStore } from "@/test/render";

import NavBar from "./NavBar";

const nav = vi.hoisted(() => ({ pathname: "/income", push: vi.fn<(href: string) => void>() }));
const signOut = vi.fn<(options: unknown) => Promise<void>>(() => Promise.resolve());

vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname, useRouter: () => ({ push: nav.push }) }));
vi.mock("next-auth/react", () => ({ signOut: (options: unknown) => signOut(options) }));
vi.mock("@/features/data/model/outbox", () => ({ clearOutbox: () => Promise.resolve() }));

describe("NavBar", () => {
  it("shows every page as a disc, names the open one and adds an entry", async () => {
    nav.pathname = "/income";
    const { user } = renderWithStore(<NavBar />);
    const pages = screen.getByRole("navigation", { name: "Pages" });
    expect(pages.querySelectorAll("a")).toHaveLength(8);
    expect(screen.getByRole("link", { name: "Income" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Accounts" })).toHaveAttribute("title", "Accounts · 6");
    await user.click(screen.getByRole("button", { name: "New entry" }));
    expect(nav.push).toHaveBeenCalledWith("/income?add=expense", { scroll: false });
  });

  it("opens the account menu, closes it on Escape and signs out", async () => {
    nav.pathname = "/settings";
    const { user } = renderWithStore(<NavBar />);
    const account = screen.getByRole("button", { name: "Your account" });
    await user.click(account);
    expect(account).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/profile");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();
    await user.click(account);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();
    await user.click(account);
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await vi.waitFor(() => expect(signOut).toHaveBeenCalledWith({ redirectTo: "/login" }));
  });
});
