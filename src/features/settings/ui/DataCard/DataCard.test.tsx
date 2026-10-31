import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import { exportBackup } from "@/features/data/model/normalize";
import type { AppState } from "@/features/data/model/types";
import type { downloadFile } from "@/shared/lib/download";
import { renderWithStore } from "@/test/render";

import DataCard from "./DataCard";

const download = vi.hoisted(() => vi.fn<typeof downloadFile>());

vi.mock(import("@/shared/lib/download"), async (importOriginal) => ({
  ...(await importOriginal()),
  downloadFile: download,
}));

const state: AppState = {
  ...DEFAULT_STATE,
  transactions: [
    { id: "t", type: "expense", amount: 1, currency: "UAH", categoryId: "cat-groceries", date: "2026-10-01" },
  ],
};

describe("DataCard", () => {
  it("downloads a backup", async () => {
    const { user } = renderWithStore(<DataCard />, { state });
    await user.click(screen.getByRole("button", { name: "Download" }));
    expect(download).toHaveBeenCalledWith(
      expect.stringMatching(/^finance-backup-/u),
      expect.any(String),
      "application/json",
    );
  });

  it("starts over after asking", async () => {
    const { user, probe } = renderWithStore(<DataCard />, { state });
    await user.click(screen.getAllByRole("button", { name: /Reset/u })[0] ?? document.body);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Reset/u }));
    expect(probe.state.transactions).toEqual([]);
  });

  it("replaces the data from a backup once confirmed", async () => {
    const backup: AppState = {
      ...state,
      transactions: [...state.transactions, { ...state.transactions[0]!, id: "u" }],
    };
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    const { user, probe } = renderWithStore(<DataCard />, { state: DEFAULT_STATE });
    await user.click(screen.getByRole("button", { name: "Choose file" }));
    expect(click).toHaveBeenCalledOnce();
    const input = screen.getByLabelText("Import from file");
    await user.upload(input, new File([exportBackup(backup)], "backup.json", { type: "application/json" }));
    const dialog = await screen.findByRole("dialog", { name: "Replace all data from the file?" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(probe.state.transactions).toEqual([]);
    await user.upload(input, new File([exportBackup(backup)], "backup.json", { type: "application/json" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Replace" }));
    expect(probe.state.transactions).toHaveLength(2);
    expect(screen.getByText(/^Imported 2 records/u)).toBeInTheDocument();
  });

  it("says what is wrong with a file that is not a backup", async () => {
    const { user } = renderWithStore(<DataCard />, { state, locale: "uk" });
    const input = screen.getByLabelText("Імпорт із файлу");
    await user.upload(input, new File(["{"], "broken.json", { type: "application/json" }));
    expect(await screen.findByText("Файл не є коректним JSON.")).toBeInTheDocument();
    await user.upload(input, new File(["{}"], "other.json", { type: "application/json" }));
    expect(await screen.findByText("Файл не схожий на резервну копію цього застосунку.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
