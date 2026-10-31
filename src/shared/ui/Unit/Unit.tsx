import type { ReactNode } from "react";

import styles from "./Unit.module.scss";

// A unit beside a figure, such as /mo
const Unit = ({ children }: { children: ReactNode }) => <span className={styles.unit}>{children}</span>;

export default Unit;
