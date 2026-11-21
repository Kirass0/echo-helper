import { useLayoutEffect } from 'react';
import { createStoredEntry } from '../storage/storedEntry';
import { useStoredEntry } from '../storage/useStoredEntry';
import { themeDefinition, type Theme } from './themeDefinition';

// The inline script built by themeBootScript.ts reads the same entry to apply the theme before first paint.
export { THEME_KEY, themeDefinition, type Theme } from './themeDefinition';

const themeEntry = createStoredEntry(themeDefinition);

/** The theme in use, applied to the page, and a toggle between dark and light. */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useStoredEntry(themeEntry);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return [theme, () => setTheme(theme === 'dark' ? 'light' : 'dark')];
}
