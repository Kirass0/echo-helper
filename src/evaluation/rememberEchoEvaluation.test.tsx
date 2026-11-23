import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { WeightTableData } from '../catalogue/catalogue';
import { inProcessCalculator } from '../test/inProcessCalculator';
import { EchoEvaluationTab } from '../test/EchoEvaluationTab';
import { ECHO_EVALUATION_KEY } from './echoEvaluationEntry';

const TABLES: readonly WeightTableData[] = [
  { name: 'Crit Rate only', weights: { Critical_Rate: 6 } },
  { name: 'Atk only', weights: { Atk_Percent: 1 } },
  { name: 'HP only', weights: { Hp_Percent: 1 } },
];

/** Opens the tab, as on page load. */
function open(builtInTables = TABLES) {
  const user = userEvent.setup();
  const view = render(
    <EchoEvaluationTab calculator={inProcessCalculator()} builtInTables={builtInTables} />,
  );
  return { user, ...view };
}

const stored = (data: unknown) => JSON.stringify({ version: 1, data });
const slotTexts = () =>
  within(screen.getByRole('list', { name: 'Tune slots' }))
    .getAllByRole('listitem')
    .map((slot) => slot.textContent);
const focusedHeading = () =>
  within(screen.getByRole('region', { name: 'Results' })).queryByRole('heading');
const rowNames = () =>
  screen
    .queryAllByRole('combobox', { name: /^Swap .* for another Weight Table$/ })
    .map((picker) =>
      picker.getAttribute('aria-label')?.replace(/^Swap (.*) for another Weight Table$/, '$1'),
    );
const firstOpenPrompt = () =>
  screen.queryByText('Pick a Substat Weight Table for your Resonator below.');

describe('remembering Echo Evaluation', () => {
  it('opens as it was left: Substats, listed tables, table in focus and targets', async () => {
    const first = open();
    const { user } = first;
    await user.click(screen.getByRole('button', { name: 'Add the Substat revealed at +5' }));
    await user.click(screen.getByRole('button', { name: 'Crit Rate' }));
    await user.click(screen.getByRole('button', { name: '8.1%' }));
    const add = screen.getByRole('combobox', { name: 'Add a Weight Table' });
    await user.selectOptions(add, 'Crit Rate only');
    await user.type(screen.getByRole('textbox', { name: 'Target Score for Crit Rate only' }), '20');
    await user.selectOptions(add, 'Atk only');
    await user.type(screen.getByRole('textbox', { name: 'ER Target Score for Atk only' }), '5');
    first.unmount();

    open();
    expect(slotTexts()[0]).toContain('Crit Rate');
    expect(slotTexts()[0]).toContain('8.1%');
    expect(rowNames()).toEqual(['Crit Rate only', 'Atk only']);
    expect(focusedHeading()).toHaveTextContent('Atk only');
    expect(screen.getByRole('textbox', { name: 'Target Score for Crit Rate only' })).toHaveValue(
      '20',
    );
    expect(screen.getByRole('textbox', { name: 'ER Target Score for Atk only' })).toHaveValue('5');
  });

  it('opens a cleared Echo empty', async () => {
    const first = open();
    const { user } = first;
    await user.click(screen.getByRole('button', { name: 'Add the Substat revealed at +5' }));
    await user.click(screen.getByRole('button', { name: 'Crit Rate' }));
    await user.click(screen.getByRole('button', { name: '8.1%' }));
    await user.click(screen.getByRole('button', { name: 'Clear Your Echo' }));
    first.unmount();

    open();
    expect(screen.getByText('Tune Stage 0/5 (+0)')).toBeInTheDocument();
    expect(slotTexts()[0]).toBe('+5Add the Substat revealed at +5');
  });

  it('remembers the targets of a removed table, and brings them back when it is listed again', async () => {
    const first = open();
    const { user } = first;
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Add a Weight Table' }),
      'Crit Rate only',
    );
    await user.type(screen.getByRole('textbox', { name: 'Target Score for Crit Rate only' }), '20');
    await user.click(screen.getByRole('button', { name: 'Remove Crit Rate only' }));
    first.unmount();

    const { user: again } = open();
    expect(firstOpenPrompt()).toBeInTheDocument();
    await again.selectOptions(
      screen.getByRole('combobox', { name: 'Add a Weight Table' }),
      'Crit Rate only',
    );
    expect(screen.getByRole('textbox', { name: 'Target Score for Crit Rate only' })).toHaveValue(
      '20',
    );
  });

  it('takes on what another tab saved', () => {
    open();
    const newValue = stored({
      substats: [],
      listed: ['HP only'],
      focused: 'HP only',
      targets: { 'HP only': { targetText: '7', erTargetText: '' } },
    });
    act(() => {
      localStorage.setItem(ECHO_EVALUATION_KEY, newValue);
      window.dispatchEvent(new StorageEvent('storage', { key: ECHO_EVALUATION_KEY, newValue }));
    });
    expect(rowNames()).toEqual(['HP only']);
    expect(focusedHeading()).toHaveTextContent('HP only');
    expect(screen.getByRole('textbox', { name: 'Target Score for HP only' })).toHaveValue('7');
  });

  it('salvages damaged data quietly', () => {
    localStorage.setItem(
      ECHO_EVALUATION_KEY,
      stored({
        substats: [
          { type: 'Luck', value: 1 },
          { type: 'Critical_Rate', value: 8.1 },
        ],
        listed: ['Atk only', 'HP only'],
        focused: 'Nobody',
        targets: { 'Atk only': { targetText: 'abc', erTargetText: '5' } },
      }),
    );
    open();
    expect(slotTexts()[0]).toContain('Crit Rate');
    expect(focusedHeading()).toHaveTextContent('Atk only');
    expect(screen.getByRole('textbox', { name: 'Target Score for Atk only' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'ER Target Score for Atk only' })).toHaveValue('5');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  describe('a listed table that no longer exists', () => {
    const leftAfterDeploy = TABLES.filter((table) => table.name !== 'Atk only');

    it('loses its row silently, and focus moves to the next row', () => {
      localStorage.setItem(
        ECHO_EVALUATION_KEY,
        stored({
          substats: [],
          listed: ['Crit Rate only', 'Atk only', 'HP only'],
          focused: 'Atk only',
          targets: {},
        }),
      );
      open(leftAfterDeploy);
      expect(rowNames()).toEqual(['Crit Rate only', 'HP only']);
      expect(focusedHeading()).toHaveTextContent('HP only');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows the first-open prompt when no row is left', () => {
      localStorage.setItem(
        ECHO_EVALUATION_KEY,
        stored({ substats: [], listed: ['Atk only'], focused: 'Atk only', targets: {} }),
      );
      open(leftAfterDeploy);
      expect(rowNames()).toEqual([]);
      expect(firstOpenPrompt()).toBeInTheDocument();
    });

    it('keeps its targets when the player changes something else', async () => {
      localStorage.setItem(
        ECHO_EVALUATION_KEY,
        stored({
          substats: [],
          listed: ['Atk only', 'HP only'],
          focused: 'Atk only',
          targets: { 'Atk only': { targetText: '9', erTargetText: '' } },
        }),
      );
      const { user } = open(leftAfterDeploy);
      await user.type(screen.getByRole('textbox', { name: 'Target Score for HP only' }), '3');
      const saved = JSON.parse(localStorage.getItem(ECHO_EVALUATION_KEY) ?? '') as {
        data: { listed: string[]; targets: Record<string, unknown> };
      };
      expect(saved.data.listed).toEqual(['HP only']);
      expect(saved.data.targets['Atk only']).toEqual({ targetText: '9', erTargetText: '' });
    });
  });
});
