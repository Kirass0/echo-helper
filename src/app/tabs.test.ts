import { describe, expect, it } from 'vitest';
import { tabFromHash } from './tabs';

describe('tabFromHash', () => {
  it.each([
    ['#evaluation', 'evaluation'],
    ['#strategy', 'strategy'],
    ['#about', 'about'],
    ['#about-credits', 'about'],
    ['#about-upgrade-strategies', 'about'],
  ] as const)('%s opens %s', (hash, tab) => {
    expect(tabFromHash(hash)).toBe(tab);
  });

  it.each(['', '#', '#nonsense', '#aboutx', '#strategy-x'])(
    'an empty or unknown hash (%j) opens Echo Evaluation',
    (hash) => {
      expect(tabFromHash(hash)).toBe('evaluation');
    },
  );
});
