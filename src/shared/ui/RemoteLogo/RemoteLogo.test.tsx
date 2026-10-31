import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RemoteLogo from "./RemoteLogo";

// The logo picture on the page
const logo = () => screen.getByRole("img", { name: "Bank" });

// Pretends a picture finished loading at a width
const loadAt = (image: HTMLElement, width: number) => {
  Object.defineProperty(image, "naturalWidth", { value: width, configurable: true });
  fireEvent.load(image);
};

describe("RemoteLogo", () => {
  it("shows the first source and falls back through the others on errors", () => {
    render(<RemoteLogo sources={["/brands/mono.png", "https://icons.example/mono.ico"]} alt="Bank" fallback="MB" />);
    expect(logo()).toHaveAttribute("src", "/brands/mono.png");
    fireEvent.error(logo());
    expect(logo()).toHaveAttribute("src", "https://icons.example/mono.ico");
    fireEvent.error(logo());
    expect(screen.getByText("MB")).toBeInTheDocument();
  });

  it("skips a tiny placeholder while another source is left", () => {
    render(<RemoteLogo sources={["/a.png", "/b.png"]} alt="Bank" fallback="?" size={20} />);
    loadAt(logo(), 16);
    expect(logo()).toHaveAttribute("src", "/b.png");
    loadAt(logo(), 16);
    expect(logo()).toHaveAttribute("src", "/b.png");
    expect(logo()).toHaveStyle({ width: "20px", height: "20px" });
  });

  it("keeps a logo that loaded at a real size", () => {
    render(<RemoteLogo sources={["/a.png", "/b.png"]} alt="Bank" fallback="?" />);
    loadAt(logo(), 64);
    expect(logo()).toHaveAttribute("src", "/a.png");
  });

  it("shows the fallback without sources", () => {
    render(<RemoteLogo sources={[]} fallback="No logo" />);
    expect(screen.getByText("No logo")).toBeInTheDocument();
  });
});
