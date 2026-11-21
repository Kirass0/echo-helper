import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { THEME_KEY, themeDefinition } from './theme';
import { themeBootScript, themeBootScriptPlugin } from './themeBootScript';

// The inline script applies the stored theme before first paint. It runs outside the bundle, so it is exercised here
// on its own, against the same entry format; the e2e tests check it in the built page.
const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

function runBootScript(getItem: (key: string) => string | null) {
  const root = { dataset: {} as Record<string, string> };
  const run = new Function('localStorage', 'document', themeBootScript());
  run({ getItem }, { documentElement: root });
  return root.dataset.theme;
}

const stored = (data: unknown, version = themeDefinition.version) =>
  JSON.stringify({ version, data });

describe('theme boot script', () => {
  it('is injected by the build, and the page starts dark without it', () => {
    expect(html).not.toMatch(/<script>/);
    expect(html).toMatch(/<html[^>]*data-theme="dark"/);
    expect(html).not.toMatch(/theme-color/);
    const transform = themeBootScriptPlugin().transformIndexHtml as () => unknown;
    expect(transform()).toEqual([{ tag: 'script', children: themeBootScript(), injectTo: 'head' }]);
  });

  it('applies a stored light theme of the Theme entry’s key and version', () => {
    expect(runBootScript((key) => (key === THEME_KEY ? stored('light') : null))).toBe('light');
  });

  it.each([
    ['nothing stored', null],
    ['a stored dark theme', stored('dark')],
    ['an unknown theme', stored('sepia')],
    ['broken JSON', '{"version"'],
    ['an entry from a newer version', stored('light', themeDefinition.version + 1)],
    ['an entry from an older version, until the app migrates it', stored('light', 0)],
    ['an entry with an unreadable version', stored('light', '1' as unknown as number)],
  ])('leaves the page dark for %s', (_, raw) => {
    expect(runBootScript(() => raw)).not.toBe('light');
  });

  it('leaves the page dark when storage throws', () => {
    expect(
      runBootScript(() => {
        throw new Error('blocked');
      }),
    ).not.toBe('light');
  });
});
