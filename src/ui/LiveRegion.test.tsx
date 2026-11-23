// The one polite live region (spec §15): a line once results settle, a message as soon as it appears.
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveRegion, SETTLE_DELAY_MS, type Announcement } from './LiveRegion';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const region = () => screen.getByRole('status');
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

function show(announcement: Announcement | null) {
  const { rerender } = render(<LiveRegion announcement={announcement} />);
  return (next: Announcement | null) => rerender(<LiveRegion announcement={next} />);
}

describe('LiveRegion', () => {
  it('is one polite region, empty at first', () => {
    show(null);
    expect(region()).toHaveAttribute('aria-live', 'polite');
    expect(region()).toBeEmptyDOMElement();
  });

  it('speaks a settled line about 1 s after the results settle, not before', async () => {
    show({ line: 'Success Rate: 12.3%' });
    expect(SETTLE_DELAY_MS).toBe(1000);
    await wait(999);
    expect(region()).toBeEmptyDOMElement();
    await wait(1);
    expect(region()).toHaveTextContent('Success Rate: 12.3%');
  });

  it('waits afresh when the results change again before they settle', async () => {
    const change = show({ line: 'Success Rate: 12.3%' });
    await wait(600);
    change(null);
    await wait(600);
    change({ line: 'Success Rate: 15.0%' });
    await wait(600);
    expect(region()).toBeEmptyDOMElement();
    await wait(400);
    expect(region()).toHaveTextContent('Success Rate: 15.0%');
  });

  it('empties while results are pending, so the same line settling again is spoken again', async () => {
    const change = show({ line: 'Echo Score: 12.00' });
    await wait(1000);
    change(null);
    expect(region()).toBeEmptyDOMElement();
    change({ line: 'Echo Score: 12.00' });
    await wait(1000);
    expect(region()).toHaveTextContent('Echo Score: 12.00');
  });

  it('speaks a message as soon as it appears', async () => {
    const change = show({ line: 'Success Rate: 12.3%' });
    await wait(1000);
    change({ message: 'Results are from before your last change.' });
    expect(region()).toHaveTextContent('Results are from before your last change.');
  });
});
