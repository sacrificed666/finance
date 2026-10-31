import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_STATE } from "@/features/data/model/defaults";
import { renderWithStore } from "@/test/render";

import TripleMoney from "./TripleMoney";

describe("TripleMoney", () => {
  it("shows the amount and the same amount in the other currencies", () => {
    const settings = { ...DEFAULT_STATE.settings, rates: { USD: 40, EUR: 50 } };
    renderWithStore(<TripleMoney amount={4000} currency="UAH" settings={settings} />, {
      state: { ...DEFAULT_STATE, settings },
    });
    expect(screen.getByText("4,000.00 ₴")).toBeInTheDocument();
    expect(screen.getByText("$100.00 · €80.00")).toBeInTheDocument();
  });
});
