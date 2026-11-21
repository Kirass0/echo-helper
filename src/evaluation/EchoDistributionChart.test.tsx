import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ChanceAtOrAbove, EchoEvaluationResult } from '../calculation/protocol';
import { EchoDistributionChart, type ChartedListedTable } from './EchoDistributionChart';

function result(
  tableName: string,
  distribution: readonly ChanceAtOrAbove[],
  extra: Partial<EchoEvaluationResult> = {},
): EchoEvaluationResult {
  return {
    tableName,
    fullyTuned: false,
    hasEnergyRegen: false,
    echoScore: distribution[0]?.threshold ?? 0,
    topPercent: 0.5,
    erTopPercent: null,
    targetChance: null,
    erTargetChance: null,
    reachesTarget: null,
    reachesErTarget: null,
    median: 0,
    average: 0,
    best: distribution.at(-1)?.threshold ?? 0,
    distribution,
    ...extra,
  };
}

const listed = (
  name: string,
  distribution: readonly ChanceAtOrAbove[],
  {
    targetScore = null,
    erTargetScore = null,
    ...extra
  }: Partial<ChartedListedTable & EchoEvaluationResult> = {},
): ChartedListedTable => ({
  name,
  targetScore,
  erTargetScore,
  result: result(name, distribution, extra),
});

const cantarella = listed(
  'Cantarella',
  [
    { threshold: 8.2, chance: 1 },
    { threshold: 14, chance: 0.6 },
    { threshold: 22.5, chance: 0.2 },
  ],
  { targetScore: 20, targetChance: 0.34 },
);
const carlotta = listed('Carlotta', [
  { threshold: 10, chance: 1 },
  { threshold: 31.5, chance: 0.1 },
]);

const chart = () => screen.getByRole('img');
const xTicks = () =>
  Array.from(chart().querySelectorAll('[data-axis="x"] text'), (tick) => tick.textContent);

describe('the Echo distribution chart', () => {
  it('spans every listed table and names the focused one’s Target Chance', () => {
    render(<EchoDistributionChart tables={[cantarella, carlotta]} focused="Cantarella" />);
    expect(chart()).toHaveAccessibleName(
      'Echo distribution for Cantarella: final Echo Score from 8.2 to 31.5, Target Score 20 at 34% chance.',
    );
  });

  it('widens the axis to every listed table’s targets, not just the focused one’s', () => {
    const withErTarget = { ...carlotta, erTargetScore: 35 };
    const withLowTarget = { ...listed('Low', [{ threshold: 12, chance: 1 }]), targetScore: 4.25 };
    render(
      <EchoDistributionChart
        tables={[cantarella, withErTarget, withLowTarget]}
        focused="Cantarella"
      />,
    );
    expect(chart()).toHaveAccessibleName(
      'Echo distribution for Cantarella: final Echo Score from 4.3 to 35.0, Target Score 20 at 34% chance.',
    );
  });

  it('widens the axis to a listed table’s targets before its result arrives', () => {
    const waiting: ChartedListedTable = {
      name: 'Waiting',
      targetScore: 40,
      erTargetScore: 2.5,
      result: null,
    };
    render(<EchoDistributionChart tables={[cantarella, waiting]} focused="Cantarella" />);
    expect(chart()).toHaveAccessibleName(
      'Echo distribution for Cantarella: final Echo Score from 2.5 to 40.0, Target Score 20 at 34% chance.',
    );
  });

  it('never moves the axis when the focus switches', () => {
    const { rerender } = render(
      <EchoDistributionChart tables={[cantarella, carlotta]} focused="Cantarella" />,
    );
    const ticks = xTicks();
    expect(ticks.length).toBeGreaterThan(2);
    rerender(<EchoDistributionChart tables={[cantarella, carlotta]} focused="Carlotta" />);
    expect(xTicks()).toEqual(ticks);
    expect(chart()).toHaveAccessibleName(
      'Echo distribution for Carlotta: final Echo Score from 8.2 to 31.5.',
    );
  });

  it('says whether a 5/5 Echo reached its Target Score', () => {
    const done = listed('Done', [{ threshold: 18, chance: 1 }], {
      fullyTuned: true,
      targetScore: 20,
      reachesTarget: false,
    });
    render(<EchoDistributionChart tables={[done, carlotta]} focused="Done" />);
    expect(chart()).toHaveAccessibleName(
      'Echo distribution for Done: final Echo Score from 10.0 to 31.5, Target Score 20 not reached.',
    );
  });

  it('has a fixed legend above it naming the focused table, the other tables and the targets', () => {
    render(<EchoDistributionChart tables={[cantarella]} focused="Cantarella" />);
    const legend = screen.getByRole('list', { name: 'Legend' });
    expect(
      within(legend)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Cantarella', 'Other tables', 'Target Score', 'ER Target Score']);
  });

  it('is headed Echo distribution with labelled axes', () => {
    render(<EchoDistributionChart tables={[cantarella]} focused="Cantarella" />);
    expect(screen.getByRole('heading', { name: 'Echo distribution' })).toBeInTheDocument();
    expect(chart()).toHaveTextContent('Final Echo Score');
    expect(chart()).toHaveTextContent('Chance');
  });
});
