import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IconButton } from './IconButton';
import { PencilIcon } from './icons';

// Advancing with real time too lets user-event's own zero-delay timers run.
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

function renderButton(onClick = () => {}) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<IconButton label="Change the Substat at +5" icon={<PencilIcon />} onClick={onClick} />);
  return user;
}

const button = () => screen.getByRole('button', { name: 'Change the Substat at +5' });
const tooltip = () => screen.queryByRole('tooltip');
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('IconButton', () => {
  it('is labelled by its text and shows no tooltip at first', () => {
    renderButton();
    expect(button()).not.toHaveAttribute('title');
    expect(tooltip()).not.toBeInTheDocument();
  });

  it('shows no tooltip on hover, however long the pointer rests', async () => {
    const user = renderButton();
    await user.hover(button());
    await wait(1000);
    expect(tooltip()).not.toBeInTheDocument();
  });

  it('shows no tooltip on keyboard focus', async () => {
    const user = renderButton();
    await user.tab();
    expect(button()).toHaveFocus();
    expect(tooltip()).not.toBeInTheDocument();
  });

  it('still acts on a click', async () => {
    const onClick = vi.fn();
    const user = renderButton(onClick);
    await user.click(button());
    expect(onClick).toHaveBeenCalledOnce();
  });
});
