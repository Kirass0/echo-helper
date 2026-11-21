import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { THEME_KEY } from './theme';

// The inline script in index.html applies the stored theme before first paint. It runs outside
// the bundle, so it is exercised here on its own, against the same entry format.
const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1] ?? '');

function runBootScript(getItem: (key: string) => string | null) {
  const root = { dataset: {} as Record<string, string> };
  const run = new Function('localStorage', 'document', inlineScripts[0] ?? '');
  run({ getItem }, { documentElement: root });
  return root.dataset.theme;
}

const stored = (data: unknown, version = 1) => JSON.stringify({ version, data });

describe('theme boot script in index.html', () => {
  it('is the only inline script, and the page starts dark without it', () => {
    expect(inlineScripts).toHaveLength(1);
    expect(html).toMatch(/<html[^>]*data-theme="dark"/);
    expect(html).not.toMatch(/theme-color/);
  });

  it('applies a stored light theme', () => {
    expect(runBootScript((key) => (key === THEME_KEY ? stored('light') : null))).toBe('light');
  });

  it.each([
    ['nothing stored', null],
    ['a stored dark theme', stored('dark')],
    ['an unknown theme', stored('sepia')],
    ['broken JSON', '{"version"'],
    ['an entry from a newer version', stored('light', 2)],
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
