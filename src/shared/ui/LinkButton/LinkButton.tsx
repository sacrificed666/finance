import Link from "next/link";
import type { ReactNode } from "react";

import { cx } from "@/shared/lib/cx";

import styles from "../Button/Button.module.scss";

interface LinkButtonProps {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
  size?: "sm" | "md";
}

// An address of another app, such as webcal: for a calendar
const OTHER_APP = /^[a-z][\w+.-]*:/iu;

// A link that looks like a button: the main one, or a quiet one beside it
const LinkButton = ({ href, children, variant = "primary", size = "md" }: LinkButtonProps) => {
  const className = cx(styles.button, styles[size], styles[variant]);
  if (OTHER_APP.test(href)) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
};

export default LinkButton;
