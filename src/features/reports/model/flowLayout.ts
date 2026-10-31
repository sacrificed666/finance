import type { FlowPart, MoneyFlow } from "./flow";

export interface FlowBox {
  id: string;
  value: number;
  top: number;
  height: number;
  label: number;
}

export interface FlowBand {
  id: string;
  side: "in" | "out";
  path: string;
}

export interface FlowLayout {
  sources: FlowBox[];
  uses: FlowBox[];
  middle: { top: number; height: number };
  bands: FlowBand[];
  columns: { left: number; middle: number; right: number; node: number; label: number };
}

// The width of a node, the gap between nodes and the least room a label takes
const NODE = 10;
const GAP = 8;
const LABEL_HEIGHT = 38;

// Label centres pushed apart to a least distance and kept inside the height
const spread = (centres: number[], height: number): number[] => {
  const placed = [...centres];
  for (let index = 0; index < placed.length; index += 1) {
    const before = placed[index - 1];
    const own = placed[index] ?? 0;
    placed[index] = Math.max(own, before === undefined ? LABEL_HEIGHT / 2 : before + LABEL_HEIGHT);
  }
  for (let index = placed.length - 1; index >= 0; index -= 1) {
    const after = placed[index + 1];
    const own = placed[index] ?? 0;
    placed[index] = Math.min(own, after === undefined ? height - LABEL_HEIGHT / 2 : after - LABEL_HEIGHT);
  }
  return placed;
};

// Parts stacked down a column at a scale, centred, with a gap between them
const stack = (parts: FlowPart[], scale: number, height: number): FlowBox[] => {
  const used = parts.reduce((sum, part) => sum + part.value * scale, 0) + GAP * (parts.length - 1);
  let top = (height - used) / 2;
  const boxes = parts.map((part) => {
    const box = { id: part.id, value: part.value, top, height: Math.max(2, part.value * scale), label: 0 };
    top += part.value * scale + GAP;
    return box;
  });
  const labels = spread(
    boxes.map((box) => box.top + box.height / 2),
    height,
  );
  return boxes.map((box, index) => Object.assign(box, { label: labels[index] ?? 0 }));
};

// A band from one edge to another, as wide at each end as its share
const band = (x1: number, top1: number, x2: number, top2: number, size: number) => {
  const mid = (x1 + x2) / 2;
  return [
    `M${x1} ${top1}`,
    `C${mid} ${top1} ${mid} ${top2} ${x2} ${top2}`,
    `L${x2} ${top2 + size}`,
    `C${mid} ${top2 + size} ${mid} ${top1 + size} ${x1} ${top1 + size}`,
    "Z",
  ].join("");
};

// Where every node, band and label of the flow sits in a box of a width and height
export const flowLayout = (flow: MoneyFlow, width: number, height: number): FlowLayout => {
  const label = Math.min(150, Math.max(84, width * 0.22));
  const left = label;
  const right = width - label - NODE;
  const middle = (width - NODE) / 2;
  const most = Math.max(flow.sources.length, flow.uses.length);
  const scale = (height - GAP * (most - 1)) / flow.total;
  const sources = stack(flow.sources, scale, height);
  const uses = stack(flow.uses, scale, height);
  const pool = { top: (height - flow.total * scale) / 2, height: flow.total * scale };
  let into = pool.top;
  let outOf = pool.top;
  const bands: FlowBand[] = [
    ...sources.map((box) => {
      const size = box.value * scale;
      const path = band(left + NODE, box.top, middle, into, size);
      into += size;
      return { id: box.id, side: "in" as const, path };
    }),
    ...uses.map((box) => {
      const size = box.value * scale;
      const path = band(middle + NODE, outOf, right, box.top, size);
      outOf += size;
      return { id: box.id, side: "out" as const, path };
    }),
  ];
  return { sources, uses, middle: pool, bands, columns: { left, middle, right, node: NODE, label } };
};
