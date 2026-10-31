import type { ReactNode } from "react";

import styles from "./HeroHeading.module.scss";

interface HeroHeadingProps {
  title: string;
  summary?: ReactNode;
}

// The small caps title of a hero picture with its summary on the right
const HeroHeading = ({ title, summary }: HeroHeadingProps) => (
  <div className={styles.heading}>
    <p className={styles.title}>{title}</p>
    {summary && <p className={styles.summary}>{summary}</p>}
  </div>
);

export default HeroHeading;
