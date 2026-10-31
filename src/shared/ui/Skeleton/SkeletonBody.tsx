import { cx } from "@/shared/lib/cx";

import { places } from "./places";
import SkeletonRows from "./SkeletonRows";

import styles from "./Skeleton.module.scss";

export type SkeletonShape =
  | { kind: "rows"; count: number }
  | { kind: "block"; height: number; width?: number }
  | { kind: "tiles"; count: number; columns: number; height: number; phoneColumns?: number }
  | { kind: "split"; count: number }
  | { kind: "fields"; count: number };

interface SkeletonBodyProps {
  shape: SkeletonShape;
}

// The inside of a card while it loads, in the shape of what will fill it
const SkeletonBody = ({ shape }: SkeletonBodyProps) => {
  switch (shape.kind) {
    case "rows": {
      return <SkeletonRows count={shape.count} />;
    }
    case "block": {
      return (
        <span
          className={cx(styles.bone, styles.block, shape.width !== undefined && styles.centred)}
          style={{ height: shape.height, maxWidth: shape.width }}
        />
      );
    }
    case "tiles": {
      return (
        <div className={styles.tiles} style={{ "--cols": shape.columns, "--phone-cols": shape.phoneColumns ?? 2 }}>
          {places(shape.count).map((place) => (
            <span key={place} className={cx(styles.bone, styles.innerTile)} style={{ height: `${shape.height}rem` }} />
          ))}
        </div>
      );
    }
    case "split": {
      return (
        <div className={styles.split}>
          <span className={cx(styles.bone, styles.splitBar)} />
          {places(shape.count).map((place) => (
            <span key={place} className={styles.legend}>
              <span className={cx(styles.bone, styles.dot)} />
              <span className={cx(styles.bone, styles.legendName)} />
              <span className={cx(styles.bone, styles.legendValue)} />
            </span>
          ))}
        </div>
      );
    }
    case "fields": {
      return (
        <div className={styles.fields}>
          {places(shape.count).map((place) => (
            <span key={place} className={styles.field}>
              <span className={cx(styles.bone, styles.label)} />
              <span className={cx(styles.bone, styles.control)} />
            </span>
          ))}
        </div>
      );
    }
  }
};

export default SkeletonBody;
