import type { InputHTMLAttributes, ReactNode } from "react";

import { cx } from "@/shared/lib/cx";

import styles from "./TextInput.module.scss";

export type ControlSize = "sm" | "md";

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix" | "size"> {
  prefix?: ReactNode;
  size?: ControlSize;
}

// A glass text field; a prefix such as a currency sign sits inside its left edge
const TextInput = ({ className, size = "md", prefix, ...props }: TextInputProps) => {
  const blankDate = props.type === "date" && !props.value;
  const input = cx(
    styles.input,
    styles[size],
    prefix !== undefined && styles.prefixed,
    blankDate && styles.blank,
    className,
  );
  if (prefix === undefined) return <input className={input} {...props} />;
  return (
    <div className={styles.wrap}>
      <span aria-hidden className={cx(styles.prefix, size === "sm" ? styles.prefixSm : styles.prefixMd)}>
        {prefix}
      </span>
      <input className={input} {...props} />
    </div>
  );
};

export default TextInput;
