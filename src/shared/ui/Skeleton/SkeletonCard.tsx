import { cx } from "@/shared/lib/cx";

import SkeletonBody, { type SkeletonShape } from "./SkeletonBody";

import styles from "./Skeleton.module.scss";

interface SkeletonCardProps {
  shape: SkeletonShape;
  action?: boolean;
}

// A card while it loads: mark, name, subtitle, maybe an action, then its body
const SkeletonCard = ({ shape, action = false }: SkeletonCardProps) => (
  <div className={styles.card}>
    <div className={styles.head}>
      <span className={cx(styles.bone, styles.mark)} />
      <span className={styles.titles}>
        <span className={cx(styles.bone, styles.title)} />
        <span className={cx(styles.bone, styles.subtitle)} />
      </span>
      {action && <span className={cx(styles.bone, styles.action)} />}
    </div>
    <SkeletonBody shape={shape} />
  </div>
);

export default SkeletonCard;
