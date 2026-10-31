import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import TextArea from "./TextArea";

describe("TextArea", () => {
  it("is a multi-line field that keeps extra classes", () => {
    render(<TextArea aria-label="About" defaultValue="Saving for a flat" className="extra" />);
    const area = screen.getByRole("textbox", { name: "About" });
    expect(area.tagName).toBe("TEXTAREA");
    expect(area).toHaveValue("Saving for a flat");
    expect(area).toHaveClass("extra");
  });
});
