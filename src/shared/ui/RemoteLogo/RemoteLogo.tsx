"use client";

import { type ReactNode, type SyntheticEvent, useState } from "react";

import { cx } from "@/shared/lib/cx";

import styles from "./RemoteLogo.module.scss";

interface RemoteLogoProps {
  sources: string[];
  fallback: ReactNode;
  size?: number;
  alt?: string;
  className?: string;
}

// Pictures narrower than this are placeholders, not logos
const TINY = 24;

// The first logo of a list that loads, round, or the fallback when none does
const RemoteLogo = ({ sources, fallback, size = 28, alt = "", className }: RemoteLogoProps) => {
  const [failed, setFailed] = useState<readonly string[]>([]);
  const index = sources.findIndex((source) => !failed.includes(source));
  const src = sources[index];
  if (src === undefined) return fallback;
  // Moves on to the next source
  const skip = () => setFailed((previous) => [...previous, src]);
  // Favicon services answer unknown sites with a tiny globe; the next may do better
  const checkSize = (event: SyntheticEvent<HTMLImageElement>) => {
    const width = event.currentTarget.naturalWidth;
    if (width > 0 && width < TINY && index < sources.length - 1) skip();
  };
  return (
    <img
      key={src}
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={skip}
      onLoad={checkSize}
      style={{ width: size, height: size }}
      className={cx(styles.logo, className)}
    />
  );
};

export default RemoteLogo;
