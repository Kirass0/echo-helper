import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Term } from './Term';

const TEXT = 'The Echo Score you aim for in a fully tuned Echo.';

// Advancing with real time too lets user-event's own zero-delay timers run.
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

function renderTerm(
  ui: ReactNode = (
    <p>
      Set a <Term tooltip={TEXT}>Target Score</Term> below. <button type="button">Elsewhere</button>
    </p>
  ),
) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(ui);
  return user;
}

const term = () => screen.getByRole('button', { name: 'Target Score' });
const tooltip = () => screen.queryByRole('tooltip');
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('Term', () => {
  it('is a text button described by its tooltip, closed at first', () => {
    renderTerm();
    expect(term()).toHaveAttribute('type', 'button');
    expect(term()).toHaveAccessibleDescription(TEXT);
    expect(tooltip()).not.toBeInTheDocument();
  });

  it('opens on keyboard focus and closes on Escape without moving focus', async () => {
    const user = renderTerm();
    await user.tab();
    expect(term()).toHaveFocus();
    expect(tooltip()).toHaveTextContent(TEXT);

    await user.keyboard('{Escape}');
    expect(tooltip()).not.toBeInTheDocument();
    expect(term()).toHaveFocus();
  });

  it('closes when focus leaves', async () => {
    const user = renderTerm();
    await user.tab();
    await user.tab();
    expect(tooltip()).not.toBeInTheDocument();
  });

  it('stays closed when the pointer only passes over it', async () => {
    const user = renderTerm();
    await user.hover(term());
    await wait(300);
    expect(tooltip()).not.toBeInTheDocument();
    await user.unhover(term());
    await wait(500);
    expect(tooltip()).not.toBeInTheDocument();
  });

  it('opens after a half-second hover, stays open while the pointer is over it, and closes when the pointer leaves', async () => {
    const user = renderTerm();
    await user.hover(term());
    await wait(450);
    expect(tooltip()).not.toBeInTheDocument();
    await wait(100);
    expect(tooltip()).toHaveTextContent(TEXT);

    await user.hover(screen.getByRole('tooltip'));
    await wait(300);
    expect(tooltip()).toBeInTheDocument();

    await user.unhover(screen.getByRole('tooltip'));
    await wait(200);
    expect(tooltip()).not.toBeInTheDocument();
  });

  it('makes the next term wait the full delay, right after one has been read', async () => {
    const user = renderTerm(
      <p>
        <Term tooltip={TEXT}>Target Score</Term> <Term tooltip="Another">Echo Score</Term>
      </p>,
    );
    await user.hover(term());
    await wait(550);
    expect(tooltip()).toHaveTextContent(TEXT);
    await user.unhover(term());
    await wait(200);
    expect(tooltip()).not.toBeInTheDocument();

    await user.hover(screen.getByRole('button', { name: 'Echo Score' }));
    await wait(450);
    expect(tooltip()).not.toBeInTheDocument();
    await wait(100);
    expect(tooltip()).toHaveTextContent('Another');
  });

  it('closes on Escape while hovered', async () => {
    const user = renderTerm();
    await user.hover(term());
    await wait(550);
    await user.keyboard('{Escape}');
    expect(tooltip()).not.toBeInTheDocument();
  });

  it('stays closed after Escape during the hover delay', async () => {
    const user = renderTerm();
    await user.hover(term());
    await user.keyboard('{Escape}');
    await wait(600);
    expect(tooltip()).not.toBeInTheDocument();
  });

  it('opens on a tap and closes on a tap elsewhere', async () => {
    const user = renderTerm(
      <div>
        <Term tooltip={TEXT}>Target Score</Term>
        <p>Some other text</p>
      </div>,
    );
    await user.pointer({ keys: '[TouchA]', target: term() });
    expect(tooltip()).toHaveTextContent(TEXT);

    await user.pointer({ keys: '[TouchA]', target: screen.getByText('Some other text') });
    expect(tooltip()).not.toBeInTheDocument();
  });
});
