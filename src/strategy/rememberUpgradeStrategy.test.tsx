import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../app/App';
import type { WeightTableData } from '../catalogue/catalogue';
import { inProcessCalculator } from '../test/inProcessCalculator';
import { UPGRADE_STRATEGY_KEY } from './upgradeStrategyEntry';

const TABLES: readonly WeightTableData[] = [
  { name: 'Crit Rate only', weights: { Critical_Rate: 6 } },
  { name: 'Atk only', weights: { Atk_Percent: 1 } },
];

type User = ReturnType<typeof userEvent.setup>;

/** Opens the app on Upgrade Strategy, as on page load. */
function open() {
  window.location.hash = '#strategy';
  const user = userEvent.setup();
  const view = render(
    <App
      buildDate="2026-11-20T09:30:00.000Z"
      calculator={inProcessCalculator()}
      builtInTables={TABLES}
    />,
  );
  return { user, ...view };
}

afterEach(() => {
  window.location.hash = '';
});

const stored = (data: unknown) => JSON.stringify({ version: 1, data });
const picker = () => screen.getByRole('combobox', { name: 'Substat Weight Table' });
const stage = (n: number) => screen.getByRole('region', { name: `Tune Stage ${n}/5 (+${n * 5})` });
const strategyPanel = (name: 'A' | 'B') => screen.getByRole('region', { name: `Strategy ${name}` });
const panelStage = (name: 'A' | 'B', n: number) =>
  within(strategyPanel(name)).getByRole('region', { name: `Tune Stage ${n}/5 (+${n * 5})` });
const NO_TABLE = 'Pick a Substat Weight Table above to build an Upgrade Strategy.';

/** A stored rule, holding the fields of every kind. */
const rule = (fields: Record<string, unknown>) => ({
  id: 'r',
  kind: 'substatCount',
  count: 1,
  substatTypes: [],
  substatType: 'Critical_Rate',
  minValue: 6.3,
  echoScoreText: '',
  chanceText: '',
  targetScoreText: '',
  ...fields,
});
const strategy = (...stages: unknown[][][]) => ({
  stages: [0, 1, 2, 3, 4].map((i) => stages[i] ?? []),
});

async function addRule(user: User, n: number) {
  await user.click(within(stage(n)).getByRole('button', { name: '+ add a rule' }));
}

describe('remembering Upgrade Strategy', () => {
  it('opens as it was left: the table, and the strategy with its unfinished rule', async () => {
    const first = open();
    const { user } = first;
    await user.selectOptions(picker(), 'Atk only');
    await addRule(user, 1);
    await user.selectOptions(
      within(stage(1)).getByRole('combobox', { name: 'Kind of rule' }),
      'Echo Score',
    );
    await user.type(within(stage(1)).getByRole('textbox', { name: /Echo Score/ }), '12.5');
    await addRule(user, 3);
    first.unmount();

    open();
    expect(picker()).toHaveDisplayValue('Atk only');
    expect(within(stage(1)).getByRole('textbox', { name: /Echo Score/ })).toHaveValue('12.5');
    // "Crit first"'s rules are kept, and the new unfinished rule at 3/5 too.
    expect(
      within(stage(2)).getByRole('button', { name: 'Crit Rate, Crit Damage' }),
    ).toBeInTheDocument();
    expect(within(stage(3)).getByText('Pick at least one Substat.')).toBeInTheDocument();
  });

  it('remembers Strategy B while comparing, and opens both in Done unless one holds an unfinished rule', async () => {
    const first = open();
    const { user } = first;
    await user.selectOptions(picker(), 'Crit Rate only');
    await user.click(screen.getByRole('button', { name: 'Compare with another strategy' }));
    await user.click(within(panelStage('B', 4)).getByRole('button', { name: '+ add a rule' }));
    first.unmount();

    open();
    // A, "Crit first", in Done; B holds an unfinished rule, so it opens in Edit.
    expect(within(strategyPanel('A')).queryByRole('region', { name: /Tune Stage/ })).toBeNull();
    expect(strategyPanel('A')).toHaveTextContent('at least 2 of Crit Rate, Crit Damage');
    expect(within(panelStage('B', 4)).getByText('Pick at least one Substat.')).toBeInTheDocument();
  });

  it('forgets Strategy B once comparing stops', async () => {
    const first = open();
    const { user } = first;
    await user.selectOptions(picker(), 'Crit Rate only');
    await user.click(screen.getByRole('button', { name: 'Compare with another strategy' }));
    await user.click(screen.getByRole('button', { name: 'Stop comparing' }));
    first.unmount();

    open();
    expect(screen.queryByRole('region', { name: 'Strategy B' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Compare with another strategy' }),
    ).toBeInTheDocument();
  });

  it('loads "Crit first" only when nothing is stored', () => {
    localStorage.setItem(
      UPGRADE_STRATEGY_KEY,
      stored({ table: 'Atk only', a: strategy(), b: null }),
    );
    open();
    for (const n of [1, 2, 3, 4, 5])
      expect(within(stage(n)).getByRole('button', { name: '+ add a rule' })).toBeInTheDocument();
  });

  it('opens a Substat Roll rule whose Substat is unknown as unfinished, with no Substat picked', async () => {
    localStorage.setItem(
      UPGRADE_STRATEGY_KEY,
      stored({
        table: 'Crit Rate only',
        a: strategy([[rule({ kind: 'substatRoll', substatType: 'Luck' })]]),
        b: null,
      }),
    );
    const { user } = open();
    const substat = within(stage(1)).getByRole('combobox', { name: 'Substat' });
    expect(substat).toHaveDisplayValue('pick a Substat');
    expect(substat).toHaveAccessibleDescription('Pick a Substat.');
    await user.selectOptions(substat, 'Crit Damage');
    expect(within(stage(1)).getByRole('combobox', { name: 'Lowest value' })).toHaveDisplayValue(
      '12.6%',
    );
    expect(within(stage(1)).queryByText('Pick a Substat.')).toBeNull();
  });

  it('opens with an empty strategy, not "Crit first", when the stored entry is broken', async () => {
    localStorage.setItem(UPGRADE_STRATEGY_KEY, '{not json');
    const { user } = open();
    await user.selectOptions(picker(), 'Crit Rate only');
    for (const n of [1, 2, 3, 4, 5])
      expect(within(stage(n)).getByRole('button', { name: '+ add a rule' })).toBeInTheDocument();
  });

  it('takes on what another tab saved', () => {
    open();
    const newValue = stored({
      table: 'Crit Rate only',
      a: strategy([], [], [[rule({ substatTypes: ['Critical_Damage'] })]]),
      b: strategy(),
    });
    act(() => {
      localStorage.setItem(UPGRADE_STRATEGY_KEY, newValue);
      window.dispatchEvent(new StorageEvent('storage', { key: UPGRADE_STRATEGY_KEY, newValue }));
    });
    expect(picker()).toHaveDisplayValue('Crit Rate only');
    expect(strategyPanel('A')).toHaveTextContent('at least 1 of Crit Damage');
    // Both open in Done, as on load.
    expect(strategyPanel('B')).toHaveTextContent('every Echo keeps tuning');
    expect(within(strategyPanel('B')).queryByRole('region', { name: /Tune Stage/ })).toBeNull();
  });

  it('salvages damaged data quietly, leaving compare mode for a bad Strategy B', () => {
    localStorage.setItem(
      UPGRADE_STRATEGY_KEY,
      stored({
        table: 'Crit Rate only',
        a: strategy([[rule({ kind: 'echoScore', echoScoreText: 'abc', substatTypes: ['Luck'] })]]),
        b: 'junk',
      }),
    );
    open();
    expect(screen.queryByRole('region', { name: 'Strategy B' })).toBeNull();
    expect(within(stage(1)).getByRole('textbox', { name: /Echo Score/ })).toHaveValue('');
    expect(within(stage(1)).getByText('Enter an Echo Score.')).toBeInTheDocument();
  });

  it('falls back to no table when its table no longer exists, keeping every number of the rules', async () => {
    localStorage.setItem(
      UPGRADE_STRATEGY_KEY,
      stored({
        table: 'Gone with a deploy',
        a: strategy([[rule({ kind: 'echoScore', echoScoreText: '12.5' })]]),
        b: null,
      }),
    );
    const { user } = open();
    expect(screen.getByText(NO_TABLE)).toBeInTheDocument();
    expect(picker()).toHaveDisplayValue('Choose a Weight Table…');
    await user.selectOptions(picker(), 'Atk only');
    expect(within(stage(1)).getByRole('textbox', { name: /Echo Score/ })).toHaveValue('12.5');
  });
});
