import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import type { AppState } from "@/features/data/model/types";
import type {
  BankStatus,
  connectBank,
  disconnectBank,
  fetchBankStatus,
  loadStatement,
  setBankWebhook,
} from "@/features/import/api/bank";
import { renderWithStore } from "@/test/render";

import ImportCard from "./ImportCard";

const requests = vi.hoisted(() => ({
  fetchBankStatus: vi.fn<typeof fetchBankStatus>(),
  connectBank: vi.fn<typeof connectBank>(),
  disconnectBank: vi.fn<typeof disconnectBank>(),
  setBankWebhook: vi.fn<typeof setBankWebhook>(),
  loadStatement: vi.fn<typeof loadStatement>(),
}));

vi.mock(import("@/features/import/api/bank"), async (importOriginal) => ({ ...(await importOriginal()), ...requests }));

const linked: BankStatus = {
  connected: true,
  name: "Taras",
  fetchedAt: null,
  webhook: false,
  accounts: [
    { id: "black", kind: "card", currency: "UAH", type: "black", maskedPan: "*1234", balance: 500 },
    { id: "jar1", kind: "jar", currency: "UAH", type: "jar", maskedPan: "", balance: 50, title: "Trip" },
    { id: "jar2", kind: "jar", currency: "UAH", type: "jar", maskedPan: "", balance: 5 },
    { id: "gbp", kind: "card", currency: null, type: "white", maskedPan: "*9999", balance: 1 },
  ],
};

// An account with the black card booked to its card
const bookedState: AppState = {
  ...DEFAULT_STATE,
  settings: { ...DEFAULT_STATE.settings, bankLinks: { black: "card" } },
  savings: [{ id: "card", name: "Card", icon: "💳", kind: "card", currency: "UAH", openingBalance: 0 }],
};

const LINE = { id: "op", time: 1_760_000_000, description: "Silpo", mcc: 5411, amount: -120 };

// Moves the clock past the buttons' guard against double clicks
const later = () => vi.setSystemTime(Date.now() + 500);

describe("ImportCard", () => {
  beforeEach(() => {
    for (const mock of Object.values(requests)) mock.mockReset();
    requests.fetchBankStatus.mockResolvedValue(null);
    requests.disconnectBank.mockResolvedValue();
    vi.useFakeTimers({ toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("says why a token was refused", async () => {
    requests.connectBank
      .mockResolvedValueOnce({ ok: false, problem: { kind: "token" } })
      .mockResolvedValueOnce({ ok: false, problem: { kind: "wait", seconds: 30 } })
      .mockResolvedValueOnce({ ok: false, problem: { kind: "failed" } });
    const { user } = renderWithStore(<ImportCard />);
    expect(screen.getByRole("link", { name: /api\.monobank\.ua/u })).toHaveAttribute("target", "_blank");
    const connect = screen.getByRole("button", { name: "Connect" });
    expect(connect).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: /token/iu }), "x".repeat(40));
    await user.click(connect);
    expect(await screen.findByRole("alert")).toHaveTextContent("Monobank didn’t accept this token.");
    later();
    await user.click(connect);
    expect(await screen.findByText("Monobank answers once a minute. Next request in 30 s")).toBeInTheDocument();
    later();
    await user.click(connect);
    expect(await screen.findByText("Couldn’t reach Monobank. Try again later.")).toBeInTheDocument();
  });

  it("connects, lists the cards and jars and disconnects", async () => {
    requests.connectBank.mockResolvedValue({ ok: true, status: linked });
    const { user } = renderWithStore(<ImportCard />);
    await user.type(screen.getByRole("textbox", { name: /token/iu }), "x".repeat(40));
    await user.click(screen.getByRole("button", { name: "Connect" }));
    expect(await screen.findByText("*1234")).toBeInTheDocument();
    expect(screen.getByText("Trip")).toBeInTheDocument();
    expect(screen.getByText("Jar")).toBeInTheDocument();
    expect(screen.queryByText("*9999")).not.toBeInTheDocument();
    expect(screen.getByText("Choose an account for at least one card to import its operations.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load operations" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(await screen.findByRole("button", { name: "Connect" })).toBeInTheDocument();
    expect(requests.disconnectBank).toHaveBeenCalledOnce();
  });

  it("books a card to an account and back to none", async () => {
    requests.fetchBankStatus.mockResolvedValue(linked);
    const state: AppState = { ...bookedState, settings: { ...DEFAULT_STATE.settings } };
    const { user, probe } = renderWithStore(<ImportCard />, { state });
    const [picker] = await screen.findAllByRole("combobox", { name: /Book to account/u });
    await user.click(picker!);
    await user.click(screen.getByRole("option", { name: /Card/u }));
    expect(probe.state.settings.bankLinks).toEqual({ black: "card" });
    await user.click(screen.getAllByRole("combobox", { name: /Book to account/u })[0]!);
    await user.click(screen.getByRole("option", { name: "Don’t import" }));
    expect(probe.state.settings.bankLinks).toEqual({});
  });

  it("turns automatic import on and says when it needs https", async () => {
    requests.fetchBankStatus.mockResolvedValue(linked);
    requests.setBankWebhook
      .mockResolvedValueOnce({ ok: true, status: { ...linked, webhook: true } })
      .mockResolvedValueOnce({ ok: false, problem: { kind: "https" } });
    const { user } = renderWithStore(<ImportCard />, { state: bookedState });
    const hook = await screen.findByRole("switch", { name: "Import new operations automatically" });
    await user.click(hook);
    expect(requests.setBankWebhook).toHaveBeenCalledWith(true);
    expect(await screen.findByText(/On: Monobank sends every new operation/u)).toBeInTheDocument();
    await user.click(screen.getByRole("switch"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Automatic import needs AUTH_URL");
  });

  it("loads a linked account's statement into the preview and imports it", async () => {
    requests.fetchBankStatus.mockResolvedValue(linked);
    requests.loadStatement.mockImplementation((_account, _from, _to, hooks) => {
      hooks.onLoad();
      hooks.onWait(5);
      return Promise.resolve({ ok: true, items: [LINE] });
    });
    const { user, probe } = renderWithStore(<ImportCard />, { state: bookedState });
    await user.click(await screen.findByRole("radio", { name: "7 d" }));
    await user.click(await screen.findByRole("button", { name: "Load operations" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Silpo");
    await user.click(within(dialog).getByRole("button", { name: "Add 1 entry" }));
    expect(probe.state.transactions).toEqual([
      expect.objectContaining({ externalId: "mono:op", amount: 120, accountId: "card" }),
    ]);
    expect(probe.undoLabels).toEqual(["1 entry imported"]);
  });

  it("lets the preview untick, refile and close", async () => {
    requests.fetchBankStatus.mockResolvedValue(linked);
    const income = { id: "pay", time: 1_760_100_000, description: "Salary", mcc: 0, amount: 1000 };
    requests.loadStatement.mockResolvedValue({ ok: true, items: [LINE, income] });
    const { user, probe } = renderWithStore(<ImportCard />, { state: bookedState });
    await user.click(await screen.findByRole("button", { name: "Load operations" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("2 operations found")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Select none" }));
    expect(within(dialog).getByRole("button", { name: "Add 0 entries" })).toBeDisabled();
    later();
    await user.click(within(dialog).getByRole("button", { name: "Select all" }));
    await user.click(within(dialog).getByRole("checkbox", { name: "Salary" }));
    const silpo = within(dialog).getByText("Silpo").closest("li")!;
    await user.click(within(silpo).getByRole("combobox", { name: /^Category/u }));
    await user.click(screen.getByRole("option", { name: /Coffee/u }));
    await user.click(within(dialog).getByRole("button", { name: "Add 1 entry" }));
    expect(probe.state.transactions).toEqual([
      expect.objectContaining({ externalId: "mono:op", categoryId: "cat-coffee" }),
    ]);

    later();
    await user.click(screen.getByRole("button", { name: "Load operations" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("names a failed statement and stops when the card goes away", async () => {
    requests.fetchBankStatus.mockResolvedValue(linked);
    requests.loadStatement
      .mockResolvedValueOnce({ ok: false, problem: { kind: "failed" } })
      .mockResolvedValueOnce(null);
    const { user } = renderWithStore(<ImportCard />, { state: bookedState });
    await user.click(await screen.findByRole("button", { name: "Load operations" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t reach Monobank");
    later();
    await user.click(screen.getByRole("button", { name: "Load operations" }));
    await waitFor(() => expect(requests.loadStatement).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("maps a CSV statement and says when a file has no rows", async () => {
    const { user } = renderWithStore(<ImportCard />);
    const input = screen.getByLabelText("Bank statement (CSV)");
    await user.upload(input, new File([""], "empty.csv", { type: "text/csv" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This file has no rows to import.");
    await user.upload(
      input,
      new File(["Date;Amount;Description\n01.10.2026;-120,50;Coffee\n"], "bank.csv", { type: "text/csv" }),
    );
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
