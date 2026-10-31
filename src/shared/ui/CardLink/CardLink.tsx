"use client";

import Link from "next/link";

import { useI18n } from "@/shared/i18n/useI18n";
import { pageItem } from "@/shared/lib/navigation";

import Icon from "../Icon/Icon";

import styles from "./CardLink.module.scss";

interface CardLinkProps {
  href: string;
  label?: string;
}

// A small pill in a card's header naming and opening the page behind the card
const CardLink = ({ href, label }: CardLinkProps) => {
  const { t } = useI18n();
  const page = pageItem(href);
  return (
    <Link href={href} className={styles.link}>
      {label ?? (page ? t(page.label) : t("dash.all"))}
      <Icon name="arrowRight" size={13} strokeWidth={2.4} className={styles.arrow} />
    </Link>
  );
};

export default CardLink;
