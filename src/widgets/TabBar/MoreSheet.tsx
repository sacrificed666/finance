"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useI18n } from "@/shared/i18n/useI18n";
import { MORE } from "@/shared/lib/navigation";
import Sheet from "@/shared/ui/Sheet/Sheet";
import ToneMark from "@/shared/ui/ToneMark/ToneMark";

import styles from "./TabBar.module.scss";

interface MoreSheetProps {
  onClose: () => void;
}

// The pages without a tab, as a grid of their marks; choosing one closes it
const MoreSheet = ({ onClose }: MoreSheetProps) => {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <Sheet open onClose={onClose} title={t("nav.more")}>
      <ul className={styles.pages}>
        {MORE.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              onClick={onClose}
              className={styles.page}
            >
              <ToneMark icon={item.icon} tone={item.tone} size="lg" />
              <span className={styles.pageName}>{t(item.label)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Sheet>
  );
};

export default MoreSheet;
