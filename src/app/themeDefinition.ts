// The Theme entry's definition, with no React or DOM imports, so the build can read it for the pre-paint script.
import type { EntryDefinition } from '../storage/storedEntry';

export type Theme = 'dark' | 'light';

/** The `localStorage` key of the Theme entry. */
export const THEME_KEY = 'echo-helper.theme';

export const themeDefinition: EntryDefinition<Theme> = {
  key: THEME_KEY,
  version: 1,
  // The first open is always dark; the OS setting is ignored.
  fallback: () => 'dark',
  // Anything unreadable means dark.
  validate: (data) => (data === 'light' ? 'light' : 'dark'),
};
