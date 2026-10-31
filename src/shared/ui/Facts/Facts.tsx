import type { ReactNode } from "react";

import { cx } from "@/shared/lib/cx";

import styles from "./Facts.module.scss";

interface FactsProps {
  children: ReactNode;
  className?: string;
}

// The key facts of a record, two tiles per row
const Facts = ({ children, className }: FactsProps) => <dl className={cx(styles.facts, className)}>{children}</dl>;

export default Facts;
