import { describe, expect, it } from 'vitest';
import { formatBuildDate } from './buildDate';

describe('formatBuildDate', () => {
  it('shows the day, the month as a word and the year', () => {
    expect(formatBuildDate('2026-11-20T12:00:00.000Z')).toBe('20 Nov 2026');
  });

  it('uses the UTC date, not the local one', () => {
    expect(formatBuildDate('2026-01-01T23:59:59.000Z')).toBe('1 Jan 2026');
    expect(formatBuildDate('2026-12-31T00:00:01.000Z')).toBe('31 Dec 2026');
  });
});
