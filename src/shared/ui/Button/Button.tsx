"use client";

import { type ButtonHTMLAttributes, type MouseEvent, useRef } from "react";

import { cx } from "@/shared/lib/cx";

import styles from "./Button.module.scss";

export type ButtonVariant = "primary" | "ghost" | "danger" | "plain";

export type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

// Clicks closer together than this count as one
const DOUBLE_CLICK_MS = 400;

// A pill button that ignores a second click within 400 ms, so nothing saves twice
const Button = ({ variant = "primary", size = "md", className, onClick, ...props }: ButtonProps) => {
  const lastFired = useRef(0);
  // Passes the click on unless it follows the previous one too closely
  const guarded = onClick
    ? (event: MouseEvent<HTMLButtonElement>) => {
        const now = Date.now();
        if (now - lastFired.current < DOUBLE_CLICK_MS) return;
        lastFired.current = now;
        onClick(event);
      }
    : undefined;
  return (
    <button
      type="button"
      onClick={guarded}
      className={cx(styles.button, styles[size], styles[variant], className)}
      {...props}
    />
  );
};

export default Button;
