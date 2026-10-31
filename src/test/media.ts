// A media query result that matches or not, for tests that spy on matchMedia
export const mediaQuery = (matches: boolean, query: string): MediaQueryList =>
  Object.assign(new EventTarget(), {
    matches,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
  });
