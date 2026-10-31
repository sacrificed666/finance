import { cx } from "@/shared/lib/cx";

import Split from "../Split/Split";
import type { SkeletonCardShape, SkeletonPageShape } from "./shapes";
import SkeletonCard from "./SkeletonCard";
import SkeletonHero from "./SkeletonHero";

import styles from "./Skeleton.module.scss";

// A card's placeholder from its shape
const card = ({ shape, action }: SkeletonCardShape, key: number) => (
  <SkeletonCard key={key} shape={shape} action={action} />
);

interface SkeletonPageProps {
  shape: SkeletonPageShape;
}

// A page's blocks while they load, laid out like the page itself
const SkeletonPage = ({ shape }: SkeletonPageProps) => (
  <div className={styles.page}>
    {shape.sections && <span className={cx(styles.bone, styles.sections)} />}
    <SkeletonHero tiles={shape.tiles} stacked={shape.stacked} />
    {shape.insights && (
      <div className={styles.insights}>
        <span className={cx(styles.bone, styles.insight)} />
        <span className={cx(styles.bone, styles.insight)} />
      </div>
    )}
    <Split
      main={shape.main.map(card)}
      side={shape.side.map(card)}
      tail={shape.tail ? card(shape.tail, 0) : undefined}
    />
    {shape.across && card(shape.across, 0)}
  </div>
);

export default SkeletonPage;
