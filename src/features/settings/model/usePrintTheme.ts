"use client";

import { useEffect } from "react";

// Prints in the light theme whatever the screen shows, then puts the theme back
export const usePrintTheme = () => {
  useEffect(() => {
    const root = document.documentElement;
    let previous: string | undefined;
    // Remembers the theme once, even when the browser asks twice
    const before = () => {
      previous ??= root.dataset.theme ?? "";
      root.dataset.theme = "light";
    };
    // Restores the theme the page had before printing
    const after = () => {
      if (previous === undefined) return;
      if (previous) root.dataset.theme = previous;
      else delete root.dataset.theme;
      previous = undefined;
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
};
