import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { blockCard, fieldsCard, rowsCard, splitCard, tilesCard } from "./shapes";
import SkeletonBody from "./SkeletonBody";
import SkeletonCard from "./SkeletonCard";
import SkeletonHero from "./SkeletonHero";
import SkeletonPage from "./SkeletonPage";

// How many elements of a class the outline holds
const count = (container: HTMLElement, name: string) => container.querySelectorAll(`[class*='${name}']`).length;

describe("SkeletonBody", () => {
  it("outlines rows, a block, tiles, a split and fields", () => {
    const { container, rerender } = render(<SkeletonBody shape={{ kind: "rows", count: 3 }} />);
    expect(count(container, "rowDisc")).toBe(3);
    rerender(<SkeletonBody shape={{ kind: "block", height: 160, width: 160 }} />);
    expect(container.querySelector("[class*='block']")).toHaveStyle({ height: "160px", maxWidth: "160px" });
    rerender(<SkeletonBody shape={{ kind: "tiles", count: 6, columns: 3, height: 4 }} />);
    expect(count(container, "innerTile")).toBe(6);
    rerender(<SkeletonBody shape={{ kind: "split", count: 2 }} />);
    expect(count(container, "legendName")).toBe(2);
    rerender(<SkeletonBody shape={{ kind: "fields", count: 2 }} />);
    expect(count(container, "control")).toBe(2);
  });
});

describe("SkeletonCard and SkeletonHero", () => {
  it("draws a card's head with its action, and the hero with its tiles", () => {
    const { container, rerender } = render(<SkeletonCard shape={{ kind: "rows", count: 1 }} action />);
    expect(count(container, "action")).toBe(1);
    rerender(<SkeletonHero tiles={2} stacked />);
    expect(container.querySelectorAll("[class*='statTiles'] > *")).toHaveLength(2);
    expect(count(container, "stacked")).toBe(1);
    rerender(<SkeletonHero tiles={0} />);
    expect(count(container, "statTiles")).toBe(0);
  });
});

describe("SkeletonPage", () => {
  it("lays a page out with its sections, insights, columns, tail and a card across", () => {
    const { container } = render(
      <SkeletonPage
        shape={{
          sections: true,
          tiles: 4,
          insights: true,
          main: [blockCard(200), fieldsCard(2)],
          side: [splitCard(2), tilesCard(4, 2, 4)],
          tail: rowsCard(3),
          across: rowsCard(2),
        }}
      />,
    );
    expect(count(container, "sections")).toBe(1);
    expect(count(container, "insight")).toBe(3);
    expect(count(container, "card")).toBe(6);
    expect(count(container, "rowDisc")).toBe(5);
  });
});
