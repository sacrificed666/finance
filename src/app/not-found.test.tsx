import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/i18n/server", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  requestLocale: () => Promise.resolve("uk"),
}));

const { default: NotFound } = await import("./not-found");

describe("NotFound", () => {
  it("says so in the visitor's language and leads to the overview", async () => {
    render(await NotFound());
    expect(screen.getByRole("heading", { name: "Такої сторінки немає" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "До огляду" })).toHaveAttribute("href", "/");
  });
});
