import { afterEach, beforeEach } from 'vitest';
import { PHONE_QUERY } from '../ui/usePhoneLayout';

/**
 * Within the calling `describe`, the screen is phone width: jsdom has no `matchMedia`, so each test gets one that
 * matches only the phone query (spec §14).
 */
export function atPhoneWidth() {
  let original: typeof window.matchMedia;
  beforeEach(() => {
    original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query === PHONE_QUERY,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
  });
  afterEach(() => {
    window.matchMedia = original;
  });
}
