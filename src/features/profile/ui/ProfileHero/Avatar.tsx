"use client";

import { useState } from "react";

import styles from "./ProfileHero.module.scss";

interface AvatarProps {
  name: string;
  email: string;
  image: string;
  size?: number;
}

// The profile picture, or the first letter of the name on a green tile
const Avatar = ({ name, email, image, size = 64 }: AvatarProps) => {
  const [broken, setBroken] = useState<string | null>(null);
  const initial = (name || email || "?").trim().charAt(0).toUpperCase();
  if (!image || broken === image) {
    return (
      <span aria-hidden className={styles.initial} style={{ width: size, height: size, fontSize: size * 0.38 }}>
        {initial}
      </span>
    );
  }
  return (
    <img
      src={image}
      alt=""
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      onError={() => setBroken(image)}
      className={styles.picture}
      style={{ width: size, height: size }}
    />
  );
};

export default Avatar;
