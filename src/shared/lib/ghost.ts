// The longest a leaving copy may stay, should its animation never end
const GHOST_MS = 600;

// Whether the visitor asked for as little motion as possible
const prefersStillness = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Copies what was typed and ticked in the fields of an element onto its copy
const copyFields = (from: Element, to: Element) => {
  const typed = from.querySelectorAll<HTMLInputElement>("input, textarea, select");
  const copies = to.querySelectorAll<HTMLInputElement>("input, textarea, select");
  typed.forEach((field, index) => {
    const copy = copies[index];
    if (!copy) return;
    copy.value = field.value;
    copy.checked = field.checked;
  });
};

// A frozen copy of a removed element where it stood, playing the class's exit
export const ghostOut = (element: Element | null, className?: string, layer = 2_147_483_000): void => {
  if (!element || !className || prefersStillness()) return;
  const box = element.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) return;
  const ghost = element.cloneNode(true);
  if (!(ghost instanceof HTMLElement)) return;
  copyFields(element, ghost);
  ghost.removeAttribute("id");
  ghost.setAttribute("aria-hidden", "true");
  ghost.inert = true;
  ghost.classList.add(className);
  Object.assign(ghost.style, {
    position: "fixed",
    inset: "auto",
    left: `${String(box.left)}px`,
    top: `${String(box.top)}px`,
    width: `${String(box.width)}px`,
    height: `${String(box.height)}px`,
    margin: "0",
    pointerEvents: "none",
    zIndex: String(layer),
  });
  document.body.append(ghost);
  // Takes the copy away once its animation is over
  const remove = () => ghost.remove();
  ghost.addEventListener("animationend", remove, { once: true });
  setTimeout(remove, GHOST_MS);
};

// A full-screen dim that fades out where a dialog's backdrop was
export const ghostDim = (className?: string, layer = 2_147_482_999): void => {
  if (!className || prefersStillness()) return;
  const dim = document.createElement("div");
  dim.className = className;
  dim.setAttribute("aria-hidden", "true");
  Object.assign(dim.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: String(layer) });
  document.body.append(dim);
  // Takes the dim away once it has faded
  const remove = () => dim.remove();
  dim.addEventListener("animationend", remove, { once: true });
  setTimeout(remove, GHOST_MS);
};
