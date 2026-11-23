/** Whether the player asks for reduced motion: smooth scrolls then jump (spec §15). */
export const reducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Scrolls an element to the top of the screen, smoothly unless reduced motion is asked for. jsdom has no scrolling. */
export const scrollToTop = (element: Element) =>
  element.scrollIntoView?.({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
