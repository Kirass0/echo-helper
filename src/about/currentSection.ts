export interface ScrollView {
  /** How far below the top of the viewport a section's top may be and still count as reached, in px. */
  threshold: number;
  viewportHeight: number;
  /** Whether the page is scrolled to its end, so later sections can't scroll any higher. */
  atBottom: boolean;
  /** The section the URL hash points to, if any. */
  linked: number | null;
}

/**
 * The About section the side panel marks, from each section's top relative to the viewport: the last one whose top has
 * reached the threshold, or the first. At the end of the page the last sections can't reach the top, so there the
 * section a link went to is marked while it is in view.
 */
export function currentSection(tops: readonly number[], view: ScrollView): number {
  const { linked } = view;
  if (view.atBottom && linked !== null) {
    const top = tops[linked];
    if (top !== undefined && top > view.threshold && top < view.viewportHeight) return linked;
  }
  let current = 0;
  tops.forEach((top, index) => {
    if (top <= view.threshold) current = index;
  });
  return current;
}
