import { rowsCard, tilesCard, type SkeletonPageShape } from "@/shared/ui/Skeleton/shapes";

// The profile in outline: account, tiles, achievements, numbers, health, sign-in
export const PROFILE_SKELETON: SkeletonPageShape = {
  tiles: 4,
  main: [tilesCard(8, 2, 4.5), tilesCard(8, 4, 4)],
  side: [rowsCard(7), rowsCard(4)],
  tail: rowsCard(3),
};
