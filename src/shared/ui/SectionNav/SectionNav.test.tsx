import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import SectionNav from "./SectionNav";

const SECTIONS = [
  { id: "general", label: "General" },
  { id: "data", label: "Data" },
];

describe("SectionNav", () => {
  afterEach(() => {
    document.body.replaceChildren();
    window.history.replaceState(null, "", "/");
  });

  it("marks the first section and glides to the one chosen, keeping its address", async () => {
    const user = userEvent.setup();
    const target = document.createElement("section");
    target.id = "data";
    const scroll = vi.fn<(options?: ScrollIntoViewOptions) => void>();
    target.scrollIntoView = scroll;
    document.body.append(target);
    render(<SectionNav label="Sections" sections={SECTIONS} />);
    expect(screen.getByRole("link", { name: "General" })).toHaveAttribute("aria-current", "location");
    await user.click(screen.getByRole("link", { name: "Data" }));
    expect(scroll).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(window.location.hash).toBe("#data");
    expect(screen.getByRole("link", { name: "Data" })).toHaveAttribute("aria-current", "location");
  });

  it("leaves a link to a missing section to the browser", async () => {
    const user = userEvent.setup();
    render(<SectionNav label="Sections" sections={SECTIONS} />);
    const general = screen.getByRole("link", { name: "General" });
    general.addEventListener("click", (event) => event.preventDefault());
    await user.click(general);
    expect(screen.getByRole("navigation", { name: "Sections" })).toBeInTheDocument();
  });
});
