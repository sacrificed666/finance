// A rectangle as layout reports it
export const rect = (left: number, top: number, width: number, height: number): DOMRect => ({
  x: left,
  y: top,
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
  toJSON: () => ({ left, top, width, height }),
});

// A resize entry for a box of a size, as a ResizeObserver reports it
export const resizeEntry = (target: Element, width: number, height = 200): ResizeObserverEntry => {
  const size: ResizeObserverSize = { inlineSize: width, blockSize: height };
  return {
    target,
    contentRect: rect(0, 0, width, height),
    borderBoxSize: [size],
    contentBoxSize: [size],
    devicePixelContentBoxSize: [size],
  };
};
