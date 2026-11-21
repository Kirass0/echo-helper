// The inline script that applies the stored theme before first paint. It runs before the bundle, so the build injects
// it into index.html (see vite.config.ts), with the key and version taken from the Theme entry's definition.
import type { Plugin } from 'vite';
import { themeDefinition } from './themeDefinition';

/**
 * The script's source. It applies Light only for an entry of the current version holding "light"; anything else
 * leaves the page Dark: nothing stored, unreadable JSON, blocked storage, or an entry from a newer version, which this
 * build can't read. An entry from an older version also stays Dark until the app has loaded and migrated it.
 */
export function themeBootScript(): string {
  const { key, version } = themeDefinition;
  return [
    'try {',
    `  var e = JSON.parse(localStorage.getItem(${JSON.stringify(key)}));`,
    `  if (e && e.version === ${JSON.stringify(version)} && e.data === 'light')`,
    "    document.documentElement.dataset.theme = 'light';",
    '} catch (_) {}',
  ].join('\n');
}

/** Injects the theme boot script into the head of index.html. */
export function themeBootScriptPlugin(): Plugin {
  return {
    name: 'echo-helper-theme-boot-script',
    transformIndexHtml: () => [{ tag: 'script', children: themeBootScript(), injectTo: 'head' }],
  };
}
