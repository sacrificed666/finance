import type { ReactNode } from "react";

import type { Tone } from "@/shared/lib/chart";

import HeroHeading from "../HeroHeading/HeroHeading";
import SparkArea from "../SparkArea/SparkArea";

import styles from "./HeroTrend.module.scss";

interface HeroTrendProps {
  title: string;
  summary?: ReactNode;
  values: number[];
  tone: Tone;
  from: string;
  to: string;
  height?: number;
  fromZero?: boolean;
}

// The right half of a page's hero: an area trend that grows into the room it has
const HeroTrend = ({ title, summary, values, tone, from, to, height = 104, fromZero = false }: HeroTrendProps) => (
  <div className={styles.trend}>
    <HeroHeading title={title} summary={summary} />
    <figure className={styles.plot} style={{ minHeight: height }} aria-label={title}>
      <SparkArea values={values} tone={tone} height={height} fill fromZero={fromZero} />
    </figure>
    <div className={styles.axis}>
      <span>{from}</span>
      <span>{to}</span>
    </div>
  </div>
);

export default HeroTrend;
