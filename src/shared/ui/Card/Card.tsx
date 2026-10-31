import type { ReactNode } from "react";

import { cx } from "@/shared/lib/cx";

import type { IconName } from "../Icon/icons";
import SubjectMark from "../SubjectMark/SubjectMark";

import styles from "./Card.module.scss";

interface CardProps {
  id?: string;
  title?: string;
  subtitle?: string;
  icon?: IconName;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  glow?: boolean;
  className?: string;
}

// A glass card with an icon, title, action and footer; glow marks the headline
const Card = ({ id, title, subtitle, icon, action, children, footer, glow = false, className }: CardProps) => {
  const hasHead = Boolean(title) || Boolean(action) || Boolean(icon);
  return (
    <section id={id} className={cx(styles.card, glow && styles.glow, className)}>
      {hasHead && (
        <div className={styles.head}>
          <div className={styles.heading}>
            {icon && <SubjectMark icon={icon} />}
            {(Boolean(title) || Boolean(subtitle)) && (
              <div className={styles.titles}>
                {title && <h2 className={styles.title}>{title}</h2>}
                {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
              </div>
            )}
          </div>
          {action && <div className={styles.action}>{action}</div>}
        </div>
      )}
      {children}
      {footer && <div className={styles.footer}>{footer}</div>}
    </section>
  );
};

export default Card;
