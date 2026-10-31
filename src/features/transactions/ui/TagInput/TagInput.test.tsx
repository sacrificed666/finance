import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import TagInput from "./TagInput";

// A tag field that keeps its own tags
const Tags = ({ initial, suggestions }: { initial?: string[]; suggestions?: string[] }) => {
  const [tags, setTags] = useState(initial ?? []);
  return (
    <TagInput
      value={tags}
      onChange={setTags}
      suggestions={suggestions}
      placeholder="Add a tag"
      removeLabel={(tag) => `Remove ${tag}`}
    />
  );
};

describe("TagInput", () => {
  it("turns words into tags on Enter, a comma or leaving the field", async () => {
    render(<Tags />);
    const input = screen.getByPlaceholderText("Add a tag");
    await userEvent.type(input, "#trip{Enter}work,");
    expect(screen.getByText("#trip")).toBeInTheDocument();
    expect(screen.getByText("#work")).toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox"), "gift");
    fireEvent.blur(screen.getByRole("textbox"));
    expect(screen.getByText("#gift")).toBeInTheDocument();
  });

  it("ignores repeats in any case and empty words", async () => {
    render(<Tags initial={["Trip"]} />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "trip{Enter}  {Enter}");
    expect(screen.getAllByText(/^#/u)).toHaveLength(1);
  });

  it("removes a tag with its button or Backspace in an empty field", async () => {
    render(<Tags initial={["a", "b"]} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove a" }));
    expect(screen.queryByText("#a")).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox"), "{Backspace}");
    expect(screen.queryByText("#b")).not.toBeInTheDocument();
  });

  it("offers tags used before and adds one with a click", async () => {
    render(<Tags initial={["trip"]} suggestions={["trip", "work"]} />);
    expect(screen.queryByRole("button", { name: "+#trip" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "+#work" }));
    expect(screen.getByText("#work")).toBeInTheDocument();
  });

  it("stops taking tags at eight", () => {
    render(<Tags initial={["1", "2", "3", "4", "5", "6", "7", "8"]} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
