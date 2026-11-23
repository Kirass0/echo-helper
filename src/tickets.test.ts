import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Closing rule from docs/agents/issue-tracker.md: a ticket is `done` only once every
// acceptance-criterion box is ticked.
const scratch = new URL('../.scratch/', import.meta.url);

const isDone = (text: string) => /^\**Status:\**\s*done\s*$/m.test(text);
const untickedBoxes = (text: string) => text.split('\n').filter((line) => /^\s*- \[ \]/.test(line));

// Finished feature folders get deleted, so `.scratch/` may hold no done tickets, or may
// not exist at all (git doesn't track empty directories).
const tickets = existsSync(scratch)
  ? readdirSync(scratch, { withFileTypes: true })
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
      })
  : [];

const done = tickets.filter(({ text }) => isDone(text));

describe('done tickets', () => {
  it('are recognised by their Status line and open boxes', () => {
    const ticket = '# Title\n\n**Status:** done\n\n- [x] met\n  - [ ] not met\n';
    expect(isDone(ticket)).toBe(true);
    expect(isDone('Status: ready-for-agent\n')).toBe(false);
    expect(untickedBoxes(ticket)).toEqual(['  - [ ] not met']);
  });

  it.each(done.map(({ path, text }) => [path, text]))('%s has every box ticked', (_, text) => {
    expect(untickedBoxes(text)).toEqual([]);
  });
});
