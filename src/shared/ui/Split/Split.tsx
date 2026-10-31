import type { ReactNode } from "react";

import { cx } from "@/shared/lib/cx";

import styles from "./Split.module.scss";

interface SplitProps {
  main: ReactNode;
  side: ReactNode;
  tail?: ReactNode;
  sideFirst?: boolean;
  stickySide?: boolean;
}

// Main and side columns; a tail ends the main column, on phones after the side
const Split = ({ main, side, tail, sideFirst = false, stickySide = false }: SplitProps) => (
  <div className={cx(styles.split, tail !== undefined && styles.withTail)}>
    <div className={cx(styles.main, sideFirst && styles.mainSecond)}>{main}</div>
    <div className={cx(styles.side, sideFirst && styles.sideFirst, stickySide && styles.sticky)}>{side}</div>
    {tail !== undefined && <div className={styles.main}>{tail}</div>}
  </div>
);

export default Split;
