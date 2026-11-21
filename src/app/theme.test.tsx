import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { inProcessCalculator } from '../test/inProcessCalculator';
import { App } from './App';
import { THEME_KEY } from './theme';

function open() {
  return render(<App buildDate="2026-11-20T09:30:00.000Z" calculator={inProcessCalculator()} />);
}

function stored(data: unknown, version = 1) {
  return JSON.stringify({ version, data });
}

function shownTheme() {
  return document.documentElement.dataset.theme;
}

function otherTabWrites(newValue: string | null) {
  act(() => {
    if (newValue === null) localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, newValue);
    window.dispatchEvent(new StorageEvent('storage', { key: THEME_KEY, newValue }));
  });
}

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('theme', () => {
  it('opens dark the first time, with a button to switch to light', () => {
    open();
    expect(shownTheme()).toBe('dark');
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();
  });

  it('switches to light and back, remembering each choice', async () => {
    const user = userEvent.setup();
    open();
    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }));
    expect(shownTheme()).toBe('light');
    expect(localStorage.getItem(THEME_KEY)).toBe(stored('light'));

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(shownTheme()).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe(stored('dark'));
  });

  it('opens with the remembered theme', () => {
    localStorage.setItem(THEME_KEY, stored('light'));
    open();
    expect(shownTheme()).toBe('light');
    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument();
  });

  it.each([
    ['an unknown theme', stored('sepia')],
    ['broken JSON', '{"version":1,'],
    ['no version', '"light"'],
  ])('opens dark when the entry holds %s', (_, raw) => {
    localStorage.setItem(THEME_KEY, raw);
    open();
    expect(shownTheme()).toBe('dark');
  });

  it('follows a switch made in another tab', () => {
    open();
    otherTabWrites(stored('light'));
    expect(shownTheme()).toBe('light');
    otherTabWrites(null);
    expect(shownTheme()).toBe('dark');
  });
});
