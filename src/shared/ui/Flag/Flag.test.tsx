import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Flag from "./Flag";

describe("Flag", () => {
  it("loads decorative flags from the app itself", () => {
    render(<Flag country="UA" />);
    const flag = document.querySelector("img[src='/flags/UA']");
    expect(flag).toHaveAttribute("width", "24");
    expect(flag).toHaveAttribute("alt", "");
  });

  it("names the country when no text does", () => {
    render(<Flag country="PL" height={14} label="Polski" />);
    const flag = document.querySelector("img[src='/flags/PL']");
    expect(flag).toHaveAttribute("alt", "Polski");
    expect(flag).toHaveAttribute("width", "21");
  });
});
