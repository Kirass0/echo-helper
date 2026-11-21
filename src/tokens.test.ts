import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./global.css', import.meta.url), 'utf8');

/** The custom properties declared in the rule for `[data-theme='<theme>']`. */
function tokens(theme: 'light' | 'dark'): Record<string, string> {
  const rule = new RegExp(`\\[data-theme='${theme}'\\][^{]*\\{([^}]*)\\}`).exec(css);
  if (!rule?.[1]) throw new Error(`no ${theme} rule`);
  return Object.fromEntries(
    [...rule[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2]?.trim()]),
  );
}

function luminance(hex: string) {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

describe('theme tokens', () => {
  it('match the chosen palette and additions', () => {
    expect(tokens('light')).toMatchObject({
      '--bg': '#f3f5f9',
      '--panel': '#fff',
      '--ink': '#18202e',
      '--line': '#d8dee8',
      '--acc': '#3346c8',
      '--er': '#0e7f7f',
      '--succ': '#d99a22',
      '--st1': '#9fd8cf',
      '--st5': '#7455a6',
    });
    expect(tokens('dark')).toMatchObject({
      '--bg': '#121722',
      '--panel': '#1a2130',
      '--ink': '#e7ebf3',
      '--line': '#2f394c',
      '--acc': '#8f9cff',
      '--er': '#46c8c8',
      '--succ': '#f0b84a',
      '--st1': '#2c625d',
      '--st5': '#8d6fd0',
    });
  });

  it.each(['light', 'dark'] as const)(
    'gives fields a border of at least 3:1 against panels and page in %s',
    (theme) => {
      const t = tokens(theme);
      const fieldLine = t['--field-line'] ?? '';
      expect(fieldLine).not.toBe(t['--line']);
      for (const surface of ['--panel', '--panel2', '--bg']) {
        const expanded = (t[surface] ?? '').replace(/^#(\w)(\w)(\w)$/, '#$1$1$2$2$3$3');
        expect(contrast(fieldLine, expanded)).toBeGreaterThanOrEqual(3);
      }
    },
  );
});
