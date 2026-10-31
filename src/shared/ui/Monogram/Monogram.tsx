import { initials } from "@/shared/lib/text";

import styles from "./Monogram.module.scss";

interface MonogramProps {
  name: string;
  color: string;
  size?: number;
}

// A coloured circle with the initials of a name, for brands without a logo
const Monogram = ({ name, color, size = 28 }: MonogramProps) => (
  <span
    aria-hidden
    className={styles.monogram}
    style={{ width: size, height: size, background: color, fontSize: Math.round(size * 0.38) }}
  >
    {initials(name)}
  </span>
);

export default Monogram;
