import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { inProcessCalculator } from '../test/inProcessCalculator';
import { App } from './App';

const EVALUATION_PURPOSE =
  'Check how good an Echo is for a Resonator, and how likely it is to reach your Target Score once fully tuned.';
const STRATEGY_PURPOSE = 'Try different Upgrade Strategies and compare what they cost.';

function openAt(hash: string) {
  window.location.hash = hash;
  return render(<App buildDate="2026-11-20T09:30:00.000Z" calculator={inProcessCalculator()} />);
}

function goTo(hash: string) {
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

function currentTab() {
  return screen.getAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'page');
}

afterEach(() => {
  window.location.hash = '';
});

describe('App shell', () => {
  it('shows the name, the three tabs and the build date', () => {
    openAt('');
    const header = screen.getByRole('banner');
    expect(header).toHaveTextContent('Echo Helper');
    expect(screen.getByRole('link', { name: 'Echo Evaluation' })).toHaveAttribute(
      'href',
      '#evaluation',
    );
    expect(screen.getByRole('link', { name: 'Upgrade Strategy' })).toHaveAttribute(
      'href',
      '#strategy',
    );
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '#about');
    expect(header).toHaveTextContent('Updated 20 Nov 2026');
  });

  it('opens Echo Evaluation for an empty hash, with its purpose line', () => {
    openAt('');
    expect(currentTab()).toEqual([screen.getByRole('link', { name: 'Echo Evaluation' })]);
    expect(screen.getByText(EVALUATION_PURPOSE, { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'How it works' })).toHaveAttribute(
      'href',
      '#about-evaluating-an-echo',
    );
  });

  it('opens Echo Evaluation for an unknown hash', () => {
    openAt('#nope');
    expect(currentTab()).toEqual([screen.getByRole('link', { name: 'Echo Evaluation' })]);
  });

  it('opens Upgrade Strategy from its hash, with its purpose line', () => {
    openAt('#strategy');
    expect(currentTab()).toEqual([screen.getByRole('link', { name: 'Upgrade Strategy' })]);
    expect(screen.getByText(STRATEGY_PURPOSE, { exact: false })).toBeInTheDocument();
    expect(screen.queryByText(EVALUATION_PURPOSE, { exact: false })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'How it works' })).toHaveAttribute(
      'href',
      '#about-upgrade-strategies',
    );
  });

  it('opens About from an About section hash, with no purpose line', () => {
    openAt('#about-credits');
    expect(currentTab()).toEqual([screen.getByRole('link', { name: 'About' })]);
    expect(screen.queryByRole('link', { name: 'How it works' })).not.toBeInTheDocument();
  });

  it('switches tab when the hash changes', () => {
    openAt('#evaluation');
    goTo('#strategy');
    expect(currentTab()).toEqual([screen.getByRole('link', { name: 'Upgrade Strategy' })]);
    goTo('#about');
    expect(currentTab()).toEqual([screen.getByRole('link', { name: 'About' })]);
  });

  it('has the visible tab calculated first, and keeps the last one while About shows', () => {
    const calculator = inProcessCalculator();
    const shown = vi.spyOn(calculator, 'showTab');
    window.location.hash = '#strategy';
    render(<App buildDate="2026-11-20T09:30:00.000Z" calculator={calculator} />);
    expect(shown.mock.calls).toEqual([['strategy']]);
    goTo('#evaluation');
    goTo('#about');
    expect(shown.mock.calls).toEqual([['strategy'], ['evaluation']]);
  });
});
