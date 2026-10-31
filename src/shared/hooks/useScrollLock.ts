import { useEffect } from "react";

// How many open dialogs hold the page still, and the overflow they replaced
let locks = 0;
let previousOverflow = "";

// Stops the page scrolling while a dialog is open; stacked dialogs share a lock
export const useScrollLock = (active: boolean) => {
  useEffect(() => {
    if (!active) return;
    if (locks === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    locks += 1;
    return () => {
      locks -= 1;
      if (locks === 0) document.body.style.overflow = previousOverflow;
    };
  }, [active]);
};
