import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithStore } from "@/test/render";

import SettingsPage from "./SettingsPage";

vi.mock(import("@/features/import/api/bank"), async (importOriginal) => ({
  ...(await importOriginal()),
  fetchBankStatus: vi.fn<() => Promise<null>>(() => Promise.resolve(null)),
}));
vi.mock(import("@/features/settings/api/serverErrors"), async (importOriginal) => ({
  ...(await importOriginal()),
  fetchServerErrors: vi.fn<() => Promise<null>>(() => Promise.resolve(null)),
}));

describe("SettingsPage", () => {
  it("shows the settings cards", () => {
    renderWithStore(<SettingsPage />);
    expect(screen.getByRole("heading", { name: "Categories" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Exchange rates" })).toBeInTheDocument();
  });
});
