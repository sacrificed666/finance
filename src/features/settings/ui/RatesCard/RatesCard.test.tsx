import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import { renderWithStore } from "@/test/render";

import RatesCard from "./RatesCard";

describe("RatesCard", () => {
  it("keeps a valid rate typed by hand and ignores a wrong one", async () => {
    const { user, probe } = renderWithStore(<RatesCard />);
    const usd = screen.getByRole("textbox", { name: /^USD → UAH/u });
    await user.clear(usd);
    await user.type(usd, "42.5{Enter}");
    expect(probe.state.settings).toMatchObject({ rates: { USD: 42.5 }, ratesSource: "manual" });
    const eur = screen.getByRole("textbox", { name: /^EUR → UAH/u });
    await user.clear(eur);
    await user.type(eur, "-3{Enter}");
    expect(probe.state.settings.rates.EUR).not.toBe(-3);
  });

  it("rounds the bank's buy and sell rates", () => {
    renderWithStore(<RatesCard />, {
      state: {
        ...DEFAULT_STATE,
        settings: { ...DEFAULT_STATE.settings, ratesMeta: { USD: { buy: 45.16, sell: 45.6496 } } },
      },
    });
    expect(screen.getByText("Bank buy 45.16 · sell 45.65")).toBeInTheDocument();
  });
});
