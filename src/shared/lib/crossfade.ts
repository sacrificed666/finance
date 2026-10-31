// Changes the page through a crossfade where the browser can, else at once
export const crossfade = (change: () => void): void => {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still || typeof document.startViewTransition !== "function") {
    change();
    return;
  }
  document.startViewTransition(change);
};
