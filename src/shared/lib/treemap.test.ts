import { describe, expect, it } from "vitest";

import { squarify } from "./treemap";

// The area of every cell, rounded to whole units
const areas = (cells: ReturnType<typeof squarify<number>>) => cells.map((cell) => Math.round(cell.width * cell.height));

describe("squarify", () => {
  it("fills the box with cells as large as their values, largest first", () => {
    const cells = squarify([1, 6, 3], (value) => value, 100, 100);
    expect(cells.map((cell) => cell.item)).toEqual([6, 3, 1]);
    expect(areas(cells)).toEqual([6000, 3000, 1000]);
    expect(cells[0]).toMatchObject({ x: 0, y: 0, height: 100 });
  });

  it("keeps the cells close to square", () => {
    const cells = squarify([6, 6, 4, 3, 2, 2, 1], (value) => value, 600, 400);
    const ratios = cells.map((cell) => Math.max(cell.width / cell.height, cell.height / cell.width));
    expect(Math.max(...ratios)).toBeLessThan(3);
    expect(Math.round(cells.reduce((sum, cell) => sum + cell.width * cell.height, 0))).toBe(240000);
  });

  it("draws nothing for an empty box or nothing to share", () => {
    expect(squarify([0, 0], (value) => value, 100, 100)).toEqual([]);
    expect(squarify([1], (value) => value, 0, 100)).toEqual([]);
  });
});
