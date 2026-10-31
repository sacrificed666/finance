import { cx } from "@/shared/lib/cx";

import Icon from "../Icon/Icon";
import { type IconName, SUBJECT_SLOT } from "../Icon/icons";
import IconDisc from "../IconDisc/IconDisc";

import styles from "./SubjectMark.module.scss";

interface SubjectMarkProps {
  icon: IconName;
  className?: string;
}

// A subject's icon on its tinted disc: the mark every tile's name wears
const SubjectMark = ({ icon, className }: SubjectMarkProps) => {
  const slot = SUBJECT_SLOT[icon];
  return (
    <IconDisc colorSlot={slot} className={cx(styles.mark, slot === undefined && styles.plain, className)}>
      <Icon name={icon} size={15} strokeWidth={2} />
    </IconDisc>
  );
};

export default SubjectMark;
