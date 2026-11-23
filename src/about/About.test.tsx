import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { findTable, BUILT_IN_TABLES } from '../catalogue/catalogue';
import { ABOUT_SECTION_FOR_TAB } from '../app/tabs';
import { About } from './About';
import { PHONE_QUERY } from '../ui/usePhoneLayout';

const SECTIONS = [
  ['about-what-echo-helper-does', 'What Echo Helper does'],
  ['about-evaluating-an-echo', 'Evaluating an Echo'],
  ['about-echo-score-and-reference-rolls', 'Echo Score and Reference Rolls'],
  ['about-substat-weight-tables', 'Substat Weight Tables'],
  ['about-upgrade-strategies', 'Upgrade Strategies'],
  ['about-credits', 'Credits'],
  ['about-disclaimer', 'Disclaimer'],
] as const;

function section(id: string) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`no section #${id}`);
  return element;
}

afterEach(() => {
  window.location.hash = '';
});

describe('About', () => {
  it('has the seven sections, each at its anchor, listed in the side panel in order', () => {
    render(<About />);
    for (const [id, title] of SECTIONS)
      expect(within(section(id)).getByRole('heading', { name: title })).toBeInTheDocument();
    const panel = screen.getByRole('navigation', { name: 'About sections' });
    expect(
      within(panel)
        .getAllByRole('link')
        .map((link) => [link.getAttribute('href'), link.textContent]),
    ).toEqual(SECTIONS.map(([id, title]) => [`#${id}`, title]));
  });

  it('has the section every "How it works" link points to', () => {
    render(<About />);
    for (const id of Object.values(ABOUT_SECTION_FOR_TAB)) expect(section(id)).toBeInTheDocument();
  });

  it('marks the section the hash points to in the side panel', () => {
    window.location.hash = '#about-credits';
    render(<About />);
    const panel = screen.getByRole('navigation', { name: 'About sections' });
    expect(within(panel).getByRole('link', { name: 'Credits' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(within(panel).getByRole('link', { name: 'Disclaimer' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('explains the chart bands', () => {
    render(<About />);
    const text = section('about-evaluating-an-echo').textContent;
    expect(text).toContain('Final Echo Score');
    expect(text).toContain('60 equal bands');
  });

  it('lists the 13 Reference Rolls and works the Crit Rate example', () => {
    render(<About />);
    const scores = section('about-echo-score-and-reference-rolls');
    const rows = within(within(scores).getByRole('table'))
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.textContent);
    // The values pinned by spec §3.
    expect(rows).toEqual([
      'Crit Rate7.5%',
      'Crit Damage15%',
      'ATK%8.6%',
      'Flat ATK40',
      'HP%8.6%',
      'Flat HP430',
      'DEF%10.9%',
      'Flat DEF50',
      'Energy Regen9.2%',
      'Basic Attack DMG Bonus8.6%',
      'Heavy Attack DMG Bonus8.6%',
      'Resonance Skill DMG Bonus8.6%',
      'Resonance Liberation DMG Bonus8.6%',
    ]);
    expect(scores.textContent).toContain('W × 8.1 / 7.5');
  });

  it('states the Crit Rate cap and the Jingran and Sigrika notes, as the catalogue has them', () => {
    render(<About />);
    const text = section('about-substat-weight-tables').textContent;
    expect(text).toContain('100%');
    expect(text).toContain('Jingran');
    expect(text).toContain('50,000 HP');
    expect(text).toContain('Sigrika');
    expect(text).toContain('2.23');
    expect(findTable(BUILT_IN_TABLES, 'Sigrika')?.weights.Energy_Regen).toBe(2.23);
    const jingran = findTable(BUILT_IN_TABLES, 'Jingran')?.weights;
    expect([jingran?.Hp_Percent ?? 0, jingran?.Hp_Flat ?? 0]).toEqual([0, 0]);
  });

  it('states the Discard refund and the cost per Successful Echo', () => {
    render(<About />);
    const text = section('about-upgrade-strategies').textContent;
    expect(text).toContain('75% of its Echo EXP');
    expect(text).toContain('30% of its Tuners');
    expect(text).toContain('no Shell Credits');
    expect(text).toContain('Cost per Successful Echo');
  });

  it('thanks ChemX32, Maygi and riley with links, and points feedback to the GitHub Issues', () => {
    render(<About />);
    const credits = within(section('about-credits'));
    expect(credits.getByRole('link', { name: 'DPR spreadsheet' })).toHaveAttribute(
      'href',
      'https://docs.google.com/spreadsheets/d/1eoCTrwYIsRpacvL3KrcQpR5rwY3pbJ6gEljZdBj_DHs',
    );
    expect(credits.getByRole('link', { name: 'DPS Calculator spreadsheet' })).toHaveAttribute(
      'href',
      'https://docs.google.com/spreadsheets/d/1vTbG2HfkVxyqvNXF2taikStK-vJJf40QrWa06Fgj17c',
    );
    expect(credits.getByRole('link', { name: 'calculator' })).toHaveAttribute(
      'href',
      'https://riley31415.github.io/wuwa_calc/',
    );
    const text = section('about-credits').textContent;
    expect(text).toMatch(/thanks to ChemX32/i);
    expect(text).toContain('Maygi');
    expect(text).toContain('riley');
    expect(credits.getByRole('link', { name: 'Issues' })).toHaveAttribute(
      'href',
      'https://github.com/Kirass0/echo-helper/issues',
    );
  });

  it('on a phone, is an accordion that opens the linked section and lets several stay open', () => {
    const matchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query === PHONE_QUERY,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    try {
      window.location.hash = '#about-upgrade-strategies';
      render(<About />);
      expect(screen.queryByRole('navigation', { name: 'About sections' })).not.toBeInTheDocument();
      const strategies = section('about-upgrade-strategies');
      const credits = section('about-credits');
      expect(strategies.tagName).toBe('DETAILS');
      expect(strategies).toHaveAttribute('open');
      expect(credits).not.toHaveAttribute('open');
      within(credits).getByText('Credits').click();
      expect(credits).toHaveAttribute('open');
      expect(strategies).toHaveAttribute('open');
    } finally {
      window.matchMedia = matchMedia;
    }
  });

  it('has no theme button', () => {
    render(<About />);
    expect(screen.queryByRole('button', { name: /theme/ })).not.toBeInTheDocument();
  });
});
