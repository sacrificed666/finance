"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  value: number;
  format: (value: number) => string;
  durationMs?: number;
}

// Fast at first, settling at the end
const easeOut = (progress: number) => 1 - (1 - progress) ** 3;

// A figure that rolls from what it showed to its new value instead of jumping
const CountUp = ({ value, format, durationMs = 520 }: CountUpProps) => {
  const [shown, setShown] = useState(value);
  const latest = useRef(value);

  // Remembers the figure on screen, where the next roll starts
  useEffect(() => {
    latest.current = shown;
  });

  // Rolls the shown figure to the value, at once for reduced motion
  useEffect(() => {
    const from = latest.current;
    if (from === value) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let start: number | null = null;
    // One frame of the roll
    const step = (now: number) => {
      start ??= now;
      const progress = still ? 1 : Math.min(1, (now - start) / durationMs);
      setShown(from + (value - from) * easeOut(progress));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return format(shown);
};

export default CountUp;
