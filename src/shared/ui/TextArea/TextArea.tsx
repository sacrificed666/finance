import type { TextareaHTMLAttributes } from "react";

import { cx } from "@/shared/lib/cx";

import styles from "./TextArea.module.scss";

// A glass text area that grows only downwards
const TextArea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cx(styles.area, className)} {...props} />
);

export default TextArea;
