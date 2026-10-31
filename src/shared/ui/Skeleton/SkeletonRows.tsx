import { cx } from "@/shared/lib/cx";

import { places } from "./places";

import styles from "./Skeleton.module.scss";

interface SkeletonRowsProps {
  count: number;
}

// Placeholder rows of a list: a disc, a name with a line under it and an amount
const SkeletonRows = ({ count }: SkeletonRowsProps) => (
  <div className={styles.rows}>
    {places(count).map((place) => (
      <div key={place} className={styles.row}>
        <span className={cx(styles.bone, styles.rowDisc)} />
        <span className={styles.rowText}>
          <span className={cx(styles.bone, styles.rowName)} />
          <span className={cx(styles.bone, styles.rowMeta)} />
        </span>
        <span className={cx(styles.bone, styles.rowAmount)} />
      </div>
    ))}
  </div>
);

export default SkeletonRows;
