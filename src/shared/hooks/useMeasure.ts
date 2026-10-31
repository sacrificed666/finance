"use client";

import { type RefObject, useLayoutEffect, useRef, useState } from "react";

// The width and height of an element, kept up to date; charts draw to them
export const useMeasure = <T extends HTMLElement>(): [RefObject<T | null>, number, number] => {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  // Watches the element's box from the first layout on
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, size.width, size.height];
};
