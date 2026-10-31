import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Currency } from "@/shared/lib/money";
import { renderWithI18n } from "@/test/render";

import MoneyField from "./MoneyField";

describe("MoneyField", () => {
  it("takes an amount and switches the currency by its sign", async () => {
    const onChange = vi.fn<(value: string) => void>();
    const onCurrency = vi.fn<(currency: Currency) => void>();
    const { user } = renderWithI18n(
      <MoneyField
        label="Amount"
        hint="What it cost"
        value=""
        onChange={onChange}
        currency="UAH"
        onCurrency={onCurrency}
        currencyLabel="Currency"
      />,
    );
    await user.type(screen.getByLabelText("Amount"), "5");
    expect(onChange).toHaveBeenCalledWith("5");
    expect(screen.getByText("$")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "USD" }));
    expect(onCurrency).toHaveBeenCalledWith("USD");
    expect(screen.getByText("What it cost")).toBeInTheDocument();
  });

  it("works out a typed sum, shows what it comes to and keeps the result once left", async () => {
    const onChange = vi.fn<(value: string) => void>();
    const { user } = renderWithI18n(
      <MoneyField
        label="Amount"
        value="120+45−10"
        onChange={onChange}
        currency="UAH"
        onCurrency={vi.fn<(currency: Currency) => void>()}
        currencyLabel="Currency"
        hero
      />,
    );
    expect(screen.getByText("= 155 ₴")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Amount"));
    await user.tab();
    expect(onChange).toHaveBeenLastCalledWith("155");
  });

  it("leaves the switch out with a single currency", () => {
    renderWithI18n(
      <MoneyField
        label="Amount"
        value="1"
        onChange={vi.fn<(value: string) => void>()}
        currency="EUR"
        onCurrency={vi.fn<(currency: Currency) => void>()}
        currencyLabel="Currency"
        currencies={["EUR"]}
      />,
    );
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });
});
