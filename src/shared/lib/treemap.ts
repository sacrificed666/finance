export interface TreemapCell<T> {
  item: T;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Sized<T> {
  item: T;
  area: number;
}

// How far from square the worst rectangle of a row is, laid along a side
const worst = <T>(row: readonly Sized<T>[], side: number): number => {
  if (row.length === 0) return Infinity;
  const sum = row.reduce((total, node) => total + node.area, 0);
  const largest = Math.max(...row.map((node) => node.area));
  const smallest = Math.min(...row.map((node) => node.area));
  return Math.max((side * side * largest) / (sum * sum), (sum * sum) / (side * side * smallest));
};

// Near-square cells as large as their values filling a box: a squarified treemap
export const squarify = <T>(
  items: readonly T[],
  value: (item: T) => number,
  width: number,
  height: number,
): TreemapCell<T>[] => {
  const total = items.reduce((sum, item) => sum + Math.max(0, value(item)), 0);
  if (total <= 0 || width <= 0 || height <= 0) return [];
  const scale = (width * height) / total;
  const nodes = items
    .map((item) => ({ item, area: Math.max(0, value(item)) * scale }))
    .filter((node) => node.area > 0)
    .toSorted((a, b) => b.area - a.area);
  const cells: TreemapCell<T>[] = [];
  const box = { x: 0, y: 0, width, height };

  // Lays a row along the shorter side of what is left and shrinks the box past it
  const place = (row: readonly Sized<T>[]) => {
    const sum = row.reduce((acc, node) => acc + node.area, 0);
    if (box.width >= box.height) {
      const across = sum / box.height;
      let y = box.y;
      for (const node of row) {
        const tall = node.area / across;
        cells.push({ item: node.item, x: box.x, y, width: across, height: tall });
        y += tall;
      }
      box.x += across;
      box.width -= across;
    } else {
      const down = sum / box.width;
      let x = box.x;
      for (const node of row) {
        const wide = node.area / down;
        cells.push({ item: node.item, x, y: box.y, width: wide, height: down });
        x += wide;
      }
      box.y += down;
      box.height -= down;
    }
  };

  let row: Sized<T>[] = [];
  for (const node of nodes) {
    const side = Math.min(box.width, box.height);
    if (row.length === 0 || worst([...row, node], side) <= worst(row, side)) row.push(node);
    else {
      place(row);
      row = [node];
    }
  }
  if (row.length > 0) place(row);
  return cells;
};
