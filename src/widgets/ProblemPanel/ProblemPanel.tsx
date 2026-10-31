import type { ReactNode } from "react";

import Icon from "@/shared/ui/Icon/Icon";
import type { IconName } from "@/shared/ui/Icon/icons";

import styles from "./ProblemPanel.module.scss";

interface ProblemPanelProps {
  icon: IconName;
  title: string;
  body: ReactNode;
  detail?: string;
  actions?: ReactNode;
}

// A lit tile that stands in for a page that could not be shown, with a way on
const ProblemPanel = ({ icon, title, body, detail, actions }: ProblemPanelProps) => (
  <section className={styles.panel}>
    <span aria-hidden className={styles.mark}>
      <Icon name={icon} size={24} />
    </span>
    <h1 className={styles.title}>{title}</h1>
    <p className={styles.body}>{body}</p>
    {detail && <p className={styles.detail}>{detail}</p>}
    {actions && <div className={styles.actions}>{actions}</div>}
  </section>
);

export default ProblemPanel;
