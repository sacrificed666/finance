import type { ReactNode } from "react";

import styles from "./PageHeader.module.scss";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

// The page's title, a line under it and the actions
const PageHeader = ({ title, subtitle, action }: PageHeaderProps) => (
  <header className={styles.header}>
    <div className={styles.titles}>
      <h1 className={styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
    {action}
  </header>
);

export default PageHeader;
