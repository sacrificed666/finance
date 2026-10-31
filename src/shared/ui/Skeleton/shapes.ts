import type { SkeletonShape } from "./SkeletonBody";

export interface SkeletonCardShape {
  shape: SkeletonShape;
  action?: boolean;
}

// A page's blocks under its header: the hero, its tiles and the columns of cards
export interface SkeletonPageShape {
  sections?: boolean;
  tiles: number;
  stacked?: boolean;
  insights?: boolean;
  main: SkeletonCardShape[];
  side: SkeletonCardShape[];
  tail?: SkeletonCardShape;
  across?: SkeletonCardShape;
}

// A card of list rows
export const rowsCard = (count: number, action = false): SkeletonCardShape => ({
  shape: { kind: "rows", count },
  action,
});

// A card holding one chart, map or grid
export const blockCard = (height: number, action = false): SkeletonCardShape => ({
  shape: { kind: "block", height },
  action,
});

// A card with a split bar and its legend
export const splitCard = (count: number): SkeletonCardShape => ({ shape: { kind: "split", count } });

// A card with form fields
export const fieldsCard = (count: number): SkeletonCardShape => ({ shape: { kind: "fields", count } });

// A card of tiles in columns, each a height in rem, two a row on phones by default
export const tilesCard = (count: number, columns: number, height: number, phoneColumns = 2): SkeletonCardShape => ({
  shape: { kind: "tiles", count, columns, height, phoneColumns },
  action: true,
});
