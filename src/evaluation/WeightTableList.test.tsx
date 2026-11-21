import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { WeightTableData } from '../catalogue/catalogue';
import { inProcessCalculator } from '../test/inProcessCalculator';
import { EchoEvaluation } from './EchoEvaluation';

// Small tables, so each calculation is instant. Crit Rate only weighs Crit Rate 6.0 per Reference Roll (7.5).
const TABLES: readonly WeightTableData[] = [
  { name: 'Crit Rate only', weights: { Critical_Rate: 6 } },
  { name: 'Atk only', weights: { Atk_Percent: 1 } },
  { name: 'Crit Damage only', weights: { Critical_Damage: 1 } },
];

type User = ReturnType<typeof userEvent.setup>;

function open() {
  const user = userEvent.setup();
  render(<EchoEvaluation calculator={inProcessCalculator()} builtInTables={TABLES} />);
  return user;
}

const button = (name: string | RegExp) => screen.getByRole('button', { name });
const box = (label: string) => screen.getByRole('group', { name: label });
const addPicker = () => screen.getByRole('combobox', { name: 'Add a Weight Table' });
const optionsOf = (picker: HTMLElement) =>
  within(picker)
    .getAllByRole('option')
    .map((option) => option.textContent);

const listTable = () => screen.getByRole('table');
/** The list's rows below the header row. */
const rows = () => within(listTable()).getAllByRole('row').slice(1);
const row = (index: number) => rows()[index] as HTMLElement;
/** A cell of a row outside its controls: the Echo Score. */
const echoScoreCell = (index: number) => within(row(index)).getAllByRole('cell')[3] as HTMLElement;
const rowPicker = (name: string) =>
  screen.getByRole('combobox', { name: `Swap ${name} for another Weight Table` });
const targetBox = (name: string) =>
  screen.getByRole('textbox', { name: `Target Score for ${name}` });
const erTargetBox = (name: string) =>
  screen.getByRole('textbox', { name: `ER Target Score for ${name}` });
const focusedRowIndex = () => rows().findIndex((r) => r.getAttribute('aria-current') === 'true');
const resultsHeading = () =>
  within(screen.getByRole('region', { name: 'Results' })).getByRole('heading');

async function addSubstat(user: User, type: string, value: string) {
  await user.click(button(/^Add the Substat revealed at/));
  await user.click(button(type));
  await user.click(button(value));
}

async function listTables(user: User, ...names: string[]) {
  for (const name of names) await user.selectOptions(addPicker(), name);
}

describe('Substat Weight Tables list', () => {
  it('is one aligned table with a header row', async () => {
    const user = open();
    await listTables(user, 'Crit Rate only');
    expect(
      within(listTable())
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual([
      'Weight Table',
      'Target Score',
      'ER Target Score',
      'Echo Score',
      'Target Chance',
      'ER Target Chance',
      'Weights',
      'Remove',
    ]);
    expect(button('Weights of Crit Rate only')).toBeInTheDocument();
    expect(button('Remove Crit Rate only')).toBeInTheDocument();
  });

  it('offers only the tables not already listed, with no limit on how many', async () => {
    const user = open();
    await listTables(user, 'Crit Rate only');
    expect(optionsOf(addPicker())).toEqual([
      'Add another Weight Table…',
      'Atk only',
      'Crit Damage only',
    ]);

    await listTables(user, 'Atk only', 'Crit Damage only');
    expect(rows()).toHaveLength(3);
  });

  it('puts an added table in focus, and shows each table’s figures side by side', async () => {
    const user = open();
    await addSubstat(user, 'Crit Rate', '7.5%');
    await listTables(user, 'Crit Rate only', 'Atk only');
    expect(resultsHeading()).toHaveTextContent('Atk only');
    expect(focusedRowIndex()).toBe(1);

    await user.type(targetBox('Crit Rate only'), '6');
    await user.type(targetBox('Atk only'), '100');
    // Crit Rate 7.5 already scores 6 for the first table; the second can't reach 100.
    expect(await within(row(0)).findByText('100.00%')).toBeInTheDocument();
    expect(within(row(0)).getByText('6.00')).toBeInTheDocument();
    expect(await within(row(1)).findByText('0%')).toBeInTheDocument();
    expect(within(row(1)).getByText('0.00')).toBeInTheDocument();
  });

  it('puts a row in focus when clicked outside its controls, but never through them', async () => {
    const user = open();
    await listTables(user, 'Crit Rate only', 'Atk only');
    await user.type(targetBox('Crit Rate only'), '3');
    await user.click(button('Weights of Crit Rate only'));
    expect(focusedRowIndex()).toBe(1);

    await user.click(echoScoreCell(0));
    expect(focusedRowIndex()).toBe(0);
    expect(resultsHeading()).toHaveTextContent('Crit Rate only');
    expect(await within(box('Target Chance')).findByText(/%$/)).toBeInTheDocument();
  });

  it('swaps a row’s table in place, bringing that table’s remembered targets', async () => {
    const user = open();
    await listTables(user, 'Crit Rate only', 'Atk only');
    await user.type(targetBox('Crit Rate only'), '4');
    await user.type(erTargetBox('Crit Rate only'), '2');

    await user.selectOptions(rowPicker('Crit Rate only'), 'Crit Damage only');
    expect(within(row(0)).getByRole('combobox')).toHaveValue('Crit Damage only');
    expect(targetBox('Crit Damage only')).toHaveValue('');
    expect(focusedRowIndex()).toBe(1);

    await user.selectOptions(rowPicker('Crit Damage only'), 'Crit Rate only');
    expect(targetBox('Crit Rate only')).toHaveValue('4');
    expect(erTargetBox('Crit Rate only')).toHaveValue('2');
    expect(rows()).toHaveLength(2);
  });

  it('keeps the focused row in focus when its table is swapped', async () => {
    const user = open();
    await listTables(user, 'Crit Rate only', 'Atk only');
    await user.selectOptions(rowPicker('Atk only'), 'Crit Damage only');
    expect(focusedRowIndex()).toBe(1);
    expect(resultsHeading()).toHaveTextContent('Crit Damage only');
  });

  it('offers in a row’s picker its own table and those not listed', async () => {
    const user = open();
    await listTables(user, 'Crit Rate only', 'Atk only');
    expect(optionsOf(rowPicker('Crit Rate only'))).toEqual(['Crit Damage only', 'Crit Rate only']);
  });

  it('remembers targets per table while it is unlisted', async () => {
    const user = open();
    await listTables(user, 'Crit Rate only');
    await user.type(targetBox('Crit Rate only'), '5');
    await user.click(button('Remove Crit Rate only'));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await listTables(user, 'Crit Rate only');
    expect(targetBox('Crit Rate only')).toHaveValue('5');
  });

  it('moves focus to the next row when the focused one is removed, or to the row above if it was last', async () => {
    const user = open();
    await listTables(user, 'Crit Rate only', 'Atk only', 'Crit Damage only');
    await user.click(echoScoreCell(1));
    await user.click(button('Remove Atk only'));
    expect(resultsHeading()).toHaveTextContent('Crit Damage only');
    expect(focusedRowIndex()).toBe(1);

    await user.click(button('Remove Crit Damage only'));
    expect(resultsHeading()).toHaveTextContent('Crit Rate only');
    expect(focusedRowIndex()).toBe(0);

    await user.click(button('Remove Crit Rate only'));
    expect(
      screen.getByText('Pick a Substat Weight Table for your Resonator below.'),
    ).toBeInTheDocument();
    expect(optionsOf(addPicker())[0]).toBe('Choose a Weight Table…');
  });

  it('reads Reached or Not reached in the chance columns at 5/5', async () => {
    const user = open();
    await addSubstat(user, 'Crit Rate', '7.5%');
    await addSubstat(user, 'HP%', '8.6%');
    await addSubstat(user, 'Flat DEF', '50');
    await addSubstat(user, 'Flat HP', '430');
    await addSubstat(user, 'Energy Regen', '9.2%');
    await listTables(user, 'Crit Rate only');
    await user.type(targetBox('Crit Rate only'), '6');
    await user.type(erTargetBox('Crit Rate only'), '7');
    const cells = within(row(0)).getAllByRole('cell');
    expect(await within(cells[4] as HTMLElement).findByText('Reached')).toBeInTheDocument();
    expect(await within(cells[5] as HTMLElement).findByText('Not reached')).toBeInTheDocument();
  });
});

describe('Weight Table rows by keyboard', () => {
  it('makes each row a tab stop before its controls, in order', async () => {
    const user = open();
    await listTables(user, 'Crit Rate only', 'Atk only');
    row(0).focus();
    const order = [document.activeElement];
    for (let i = 0; i < 6; i++) {
      await user.tab();
      order.push(document.activeElement);
    }
    expect(order).toEqual([
      row(0),
      rowPicker('Crit Rate only'),
      targetBox('Crit Rate only'),
      erTargetBox('Crit Rate only'),
      button('Weights of Crit Rate only'),
      button('Remove Crit Rate only'),
      row(1),
    ]);
  });

  it('puts a row in focus with Enter or Space', async () => {
    const user = open();
    await listTables(user, 'Crit Rate only', 'Atk only');
    row(0).focus();
    await user.keyboard('{Enter}');
    expect(row(0)).toHaveAttribute('aria-current', 'true');
    expect(row(1)).not.toHaveAttribute('aria-current');

    row(1).focus();
    await user.keyboard(' ');
    expect(focusedRowIndex()).toBe(1);
  });

  it('moves focus from a row’s × to the next row’s ×, or to the add picker', async () => {
    const user = open();
    await listTables(user, 'Crit Rate only', 'Atk only');
    button('Remove Crit Rate only').focus();
    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(button('Remove Atk only'));

    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(addPicker());
  });
});
