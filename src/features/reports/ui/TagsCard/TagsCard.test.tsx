import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithI18n } from "@/test/render";

import TagsCard from "./TagsCard";

describe("TagsCard", () => {
  it("lists the tags by spending", () => {
    renderWithI18n(
      <TagsCard
        byTag={
          new Map([
            ["trip", 100],
            ["home", 900],
          ])
        }
        period="October"
        currency="UAH"
      />,
    );
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "#home900\u00A0₴",
      "#trip100\u00A0₴",
    ]);
  });
});
