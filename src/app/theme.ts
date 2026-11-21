import { useLayoutEffect } from 'react';
import { createStoredEntry, type EntryDefinition } from '../storage/storedEntry';
import { useStoredEntry } from '../storage/useStoredEntry';

export type Theme = 'dark' | 'light';

/**
 * The `localStorage` key of the Theme entry. The inline script in `index.html` reads the same key
 * and envelope (`{ "version": 1, "data": "light" }`) to apply the theme before first paint.
 */
export const THEME_KEY = 'echo-helper.theme';

export const themeDefinition: EntryDefinition<Theme> = {
  key: THEME_KEY,
  version: 1,
  // The first open is always dark; the OS setting is ignored.
  fallback: () => 'dark',
  // Anything unreadable means dark.
  validate: (data) => (data === 'light' ? 'light' : 'dark'),
};

const themeEntry = createStoredEntry(themeDefinition);

/** The theme in use, applied to the page, and a toggle between dark and light. */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useStoredEntry(themeEntry);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return [theme, () => setTheme(theme === 'dark' ? 'light' : 'dark')];
}
