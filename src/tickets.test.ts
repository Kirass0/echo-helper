import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Closing rule from docs/agents/issue-tracker.md: a ticket is `done` only once every
// acceptance-criterion box is ticked.
const scratch = new URL('../.scratch/', import.meta.url);

const tickets = readdirSync(scratch, { withFileTypes: true })
  .filter((feature) => feature.isDirectory())
  .flatMap((feature) => {
    const issues = new URL(`${feature.name}/issues/`, scratch);
    try {
      return readdirSync(issues)
        .filter((file) => file.endsWith('.md'))
        .map((file) => ({
          path: `.scratch/${feature.name}/issues/${file}`,
          text: readFileSync(new URL(file, issues), 'utf8'),
        }));
    } catch {
      return [];
    }
  });

const done = tickets.filter(({ text }) => /^\**Status:\**\s*done\s*$/m.test(text));

describe('done tickets', () => {
  it('are found', () => {
    expect(done.length).toBeGreaterThan(0);
  });

  it.each(done.map(({ path, text }) => [path, text]))('%s has every box ticked', (_, text) => {
    const unticked = text.split('\n').filter((line) => /^\s*- \[ \]/.test(line));
    expect(unticked).toEqual([]);
  });
});
