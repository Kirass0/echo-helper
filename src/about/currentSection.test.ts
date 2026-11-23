import { describe, expect, it } from 'vitest';
import { currentSection } from './currentSection';

// Section tops are relative to the top of the viewport, in px; the viewport is 800px high.
const view = { threshold: 80, viewportHeight: 800 };

describe('currentSection', () => {
  it('is the first section before any has reached the top', () => {
    expect(currentSection([200, 900, 1600], { ...view, atBottom: false, linked: null })).toBe(0);
  });

  it('is the last section whose top has passed the threshold', () => {
    expect(currentSection([-900, -100, 60, 700], { ...view, atBottom: false, linked: null })).toBe(
      2,
    );
  });

  it('at the bottom of the page, is the linked section if it is in view', () => {
    // The short last sections can never reach the top; the one a link went to is marked.
    expect(currentSection([-1500, -400, 100, 500], { ...view, atBottom: true, linked: 2 })).toBe(2);
  });

  it('at the bottom of the page, ignores a linked section scrolled out of view', () => {
    expect(currentSection([-1500, -400, 60, 500], { ...view, atBottom: true, linked: 0 })).toBe(2);
  });

  it('away from the bottom, follows the scroll even with a linked section', () => {
    expect(currentSection([-900, 40, 700], { ...view, atBottom: false, linked: 2 })).toBe(1);
  });
});
