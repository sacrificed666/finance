import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithI18n } from "@/test/render";

const report = vi.hoisted(() => vi.fn<(error: unknown, page: string) => Promise<void>>());

vi.mock("next/navigation", () => ({ usePathname: () => "/reports" }));
vi.mock("@/features/settings/api/serverErrors", () => ({ reportClientError: report }));

const { default: PageError } = await import("./error");

describe("PageError", () => {
  it("reports the failure once, offers a retry and the way to the overview", async () => {
    report.mockResolvedValue();
    const retry = vi.fn<() => void>();
    const failure = new Error("boom");
    const { user } = renderWithI18n(<PageError error={failure} retry={retry} />);
    expect(screen.getByRole("heading", { name: "Something went wrong on this page" })).toBeInTheDocument();
    expect(report).toHaveBeenCalledWith(failure, "/reports");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Go to the overview" })).toHaveAttribute("href", "/");
  });
});
