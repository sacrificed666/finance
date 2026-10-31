import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { clearServerErrors, fetchServerErrors } from "@/features/settings/api/serverErrors";
import { renderWithI18n } from "@/test/render";

import ServerErrorsCard from "./ServerErrorsCard";

const requests = vi.hoisted(() => ({
  fetchServerErrors: vi.fn<typeof fetchServerErrors>(),
  clearServerErrors: vi.fn<typeof clearServerErrors>(),
}));

vi.mock(import("@/features/settings/api/serverErrors"), () => requests);

describe("ServerErrorsCard", () => {
  it("lists the errors, opens one and clears them", async () => {
    requests.fetchServerErrors.mockResolvedValue({
      total: 1,
      errors: [{ at: "2026-10-10T08:00:00Z", route: "api/state", message: "Connection refused" }],
    });
    requests.clearServerErrors.mockResolvedValue(true);
    const { user, container } = renderWithI18n(<ServerErrorsCard />);
    await user.click(await screen.findByRole("button", { name: /api\/state/u }));
    expect(container.querySelector("[class*=whole]")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(container).toBeEmptyDOMElement();
  });
});
