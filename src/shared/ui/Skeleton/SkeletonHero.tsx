import { cx } from "@/shared/lib/cx";

import { places } from "./places";

import styles from "./Skeleton.module.scss";

interface SkeletonHeroProps {
  tiles: number;
  stacked?: boolean;
}

// The opening row while it loads: the lit tile, its picture and its figure tiles
const SkeletonHero = ({ tiles, stacked = false }: SkeletonHeroProps) => (
  <div className={cx(styles.hero, tiles > 0 && styles.heroWithTiles)}>
    <div className={styles.heroTile}>
      <div className={styles.head}>
        <span className={cx(styles.bone, styles.mark)} />
        <span className={cx(styles.bone, styles.heroLabel)} />
      </div>
      <div className={styles.heroBody}>
        <div className={styles.heroLead}>
          <span className={cx(styles.bone, styles.figure)} />
          <span className={cx(styles.bone, styles.figureSub)} />
          <span className={cx(styles.bone, styles.chip)} />
        </div>
        <span className={cx(styles.bone, styles.picture)} />
      </div>
    </div>
    {tiles > 0 && (
      <div className={cx(styles.statTiles, stacked && styles.stacked)} style={{ "--tiles": tiles }}>
        {places(tiles).map((place) => (
          <div key={place} className={styles.statTile}>
            <div className={styles.head}>
              <span className={cx(styles.bone, styles.mark)} />
              <span className={cx(styles.bone, styles.heroLabel)} />
            </div>
            <span className={cx(styles.bone, styles.statValue)} />
            <span className={cx(styles.bone, styles.statHint)} />
          </div>
        ))}
      </div>
    )}
  </div>
);

export default SkeletonHero;
