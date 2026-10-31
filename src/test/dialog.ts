const FOCUSABLE = "input, textarea, select, button, a[href], [tabindex]:not([tabindex='-1'])";

// The open modal dialogs, the topmost last
const modals: HTMLDialogElement[] = [];
const returnFocus = new WeakMap<HTMLDialogElement, Element | null>();

// Opens a dialog without making it modal
function show(this: HTMLDialogElement) {
  this.setAttribute("open", "");
}

// Opens a modal dialog and focuses its first control, as browsers do
function showModal(this: HTMLDialogElement) {
  if (this.hasAttribute("open")) throw new DOMException("The dialog is already open.", "InvalidStateError");
  returnFocus.set(this, document.activeElement);
  this.setAttribute("open", "");
  modals.push(this);
  this.querySelector<HTMLElement>(FOCUSABLE)?.focus();
}

// Closes a dialog, gives the focus back and says so
function close(this: HTMLDialogElement) {
  if (!this.hasAttribute("open")) return;
  this.removeAttribute("open");
  const at = modals.indexOf(this);
  if (at !== -1) modals.splice(at, 1);
  const previous = returnFocus.get(this);
  if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
  this.dispatchEvent(new Event("close"));
}

// Escape asks the topmost modal to close, which it does unless that is refused
const onEscape = (event: KeyboardEvent) => {
  if (event.key !== "Escape" || event.defaultPrevented) return;
  const top = modals.at(-1);
  if (!top) return;
  if (top.dispatchEvent(new Event("cancel", { cancelable: true }))) top.close();
};

// Adds the dialog methods jsdom lacks
export const installDialogPolyfill = () => {
  const prototype = HTMLDialogElement.prototype;
  if ("showModal" in prototype) return;
  Object.defineProperties(prototype, {
    open: {
      configurable: true,
      get(this: HTMLDialogElement) {
        return this.hasAttribute("open");
      },
    },
    show: { configurable: true, value: show },
    showModal: { configurable: true, value: showModal },
    close: { configurable: true, value: close },
  });
  document.addEventListener("keydown", onEscape);
};

// Forgets dialogs a test left open
export const resetDialogs = () => {
  modals.length = 0;
};
