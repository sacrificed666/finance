import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { chooseValue } from "@/test/choose";
import { renderWithStore } from "@/test/render";

import TaxCard from "./TaxCard";

describe("TaxCard", () => {
  it("starts without a tax and plans a sole proprietor's group once picked", async () => {
    const { user, probe } = renderWithStore(<TaxCard />);
    const regime = screen.getByRole("combobox", { name: /^Tax regime/u });
    expect(regime).toHaveTextContent("No tax");
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    await chooseValue(user, regime, "fop3");
    expect(probe.state.settings.tax).toMatchObject({ regime: "fop3", ratePct: 6, esv: true });
    const parts = within(screen.getByRole("list", { name: "What it takes" }));
    expect(parts.getByText("Social contribution (ЄСВ)")).toBeInTheDocument();
  });

  it("leaves the social contribution out for someone who does not pay it", async () => {
    const { user, probe } = renderWithStore(<TaxCard />);
    await chooseValue(user, screen.getByRole("combobox", { name: /^Tax regime/u }), "fop2");
    await user.click(screen.getByRole("switch", { name: "I pay the social contribution (ЄСВ)" }));
    expect(probe.state.settings.tax).toMatchObject({ regime: "fop2", esv: false });
    expect(screen.queryByText("Social contribution (ЄСВ)")).not.toBeInTheDocument();
    await chooseValue(user, screen.getByRole("combobox", { name: /^Tax regime/u }), "fop1");
    expect(probe.state.settings.tax).toMatchObject({ regime: "fop1", esv: false });
  });
});
