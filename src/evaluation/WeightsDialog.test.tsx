import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { WeightTableData } from '../catalogue/catalogue';
import { inProcessCalculator } from '../test/inProcessCalculator';
import { EchoEvaluationTab } from '../test/EchoEvaluationTab';

// Small tables, so each calculation is instant. Crit Rate only weighs Crit Rate 6.0 per Reference Roll (7.5).
const TABLES: readonly WeightTableData[] = [
  { name: 'Crit Rate only', weights: { Critical_Rate: 6 } },
  { name: 'Atk only', weights: { Atk_Percent: 1 } },
];

type User = ReturnType<typeof userEvent.setup>;

function open() {
  const user = userEvent.setup();
  render(<EchoEvaluationTab calculator={inProcessCalculator()} builtInTables={TABLES} />);
  return user;
}

const button = (name: string | RegExp) => screen.getByRole('button', { name });
const dialog = () => screen.getByRole('dialog');
const inDialog = () => within(dialog());
const addPicker = () => screen.getByRole('combobox', { name: 'Add a Weight Table' });
const rowPicker = (name: string) =>
  screen.getByRole('combobox', { name: `Swap ${name} for another Weight Table` });
const rows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);
const row = (index: number) => rows()[index] as HTMLElement;
const echoScoreCell = (index: number) => within(row(index)).getAllByRole('cell')[3] as HTMLElement;
const focusedRowIndex = () => rows().findIndex((r) => r.getAttribute('aria-current') === 'true');
const resultsHeading = () =>
  within(screen.getByRole('region', { name: 'Results' })).getByRole('heading');
const nameField = () => inDialog().getByRole('textbox', { name: 'Name' });
const weightField = (substat: string) => inDialog().getByRole('textbox', { name: substat });
const targetBox = (name: string) =>
  screen.getByRole('textbox', { name: `Target Score for ${name}` });

/** A picker's groups and their options, in order. */
const groupsOf = (picker: HTMLElement) =>
  [...picker.querySelectorAll('optgroup')].map((group) => [
    group.label,
    ...[...group.querySelectorAll('option')].map((option) => option.textContent),
  ]);

async function addCritRate(user: User) {
  await user.click(button(/^Add the Substat revealed at/));
  await user.click(button('Crit Rate'));
  await user.click(button('7.5%'));
}

/** Lists "Crit Rate only" and saves "Crit Rate only (copy)" with Crit Rate weighing `weight`. */
async function duplicateCritRate(user: User, weight: string) {
  await user.selectOptions(addPicker(), 'Crit Rate only');
  await user.click(button('Weights of Crit Rate only'));
  await user.click(inDialog().getByRole('button', { name: 'Duplicate' }));
  await user.clear(weightField('Crit Rate'));
  await user.type(weightField('Crit Rate'), weight);
  await user.click(inDialog().getByRole('button', { name: 'Save' }));
}

describe('the weights dialog', () => {
  it('shows a Built-in table’s 13 weights read-only, with only Duplicate', async () => {
    const user = open();
    await user.selectOptions(addPicker(), 'Crit Rate only');
    await user.click(button('Weights of Crit Rate only'));

    expect(inDialog().getByRole('heading', { name: 'Crit Rate only' })).toBeInTheDocument();
    expect(
      inDialog().getByText("Built-in tables can't be changed. Duplicate it to make your own."),
    ).toBeInTheDocument();
    expect(inDialog().queryAllByRole('textbox')).toHaveLength(0);
    const weights = inDialog().getAllByRole('definition');
    expect(weights).toHaveLength(13);
    expect(weights[0]).toHaveTextContent('6');
    expect(weights[1]).toHaveTextContent('0');
    expect(
      inDialog()
        .getAllByRole('button')
        .map((b) => b.textContent || b.getAttribute('aria-label')),
    ).toEqual(['Duplicate', 'Close']);
  });

  it('closes on Escape and gives focus back to its opener', async () => {
    const user = open();
    await user.selectOptions(addPicker(), 'Crit Rate only');
    await user.click(button('Weights of Crit Rate only'));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button('Weights of Crit Rate only')).toHaveFocus();
  });

  it('opens a duplicate as a draft named "X (copy)", the name ready to edit; Cancel creates nothing', async () => {
    const user = open();
    await user.selectOptions(addPicker(), 'Crit Rate only');
    await user.click(button('Weights of Crit Rate only'));
    await user.click(inDialog().getByRole('button', { name: 'Duplicate' }));

    expect(nameField()).toHaveValue('Crit Rate only (copy)');
    expect(nameField()).toHaveFocus();
    expect(inDialog().getAllByRole('textbox')).toHaveLength(1 + 13);
    expect(weightField('Crit Rate')).toHaveValue('6');

    await user.click(inDialog().getByRole('button', { name: 'Cancel' }));
    expect(rows()).toHaveLength(1);
    expect(groupsOf(addPicker())).toEqual([['Built-in', 'Atk only']]);
  });

  it('adds a saved duplicate as a new row at the end, in focus, with a Custom tag', async () => {
    const user = open();
    await addCritRate(user);
    await user.selectOptions(addPicker(), 'Atk only');
    await duplicateCritRate(user, '12');

    expect(rows()).toHaveLength(3);
    expect(rowPicker('Crit Rate only (copy)')).toHaveValue('Crit Rate only (copy)');
    expect(focusedRowIndex()).toBe(2);
    expect(within(row(2)).getByText('Custom')).toBeInTheDocument();
    expect(within(row(0)).queryByText('Custom')).not.toBeInTheDocument();
    expect(resultsHeading()).toHaveTextContent('Crit Rate only (copy)Custom');
    // Its own weights: Crit Rate 12 per Reference Roll, twice the built-in's.
    expect(await within(row(2)).findByText('12.00')).toBeInTheDocument();
    expect(echoScoreCell(1)).toHaveTextContent('6.00');
  });

  it('lists the Custom group first in every picker, then Built-in, each alphabetical', async () => {
    const user = open();
    await user.selectOptions(addPicker(), 'Atk only');
    await user.selectOptions(addPicker(), 'New Custom Weight Table…');
    await user.clear(nameField());
    await user.type(nameField(), 'Zed');
    await user.click(inDialog().getByRole('button', { name: 'Save' }));
    await user.keyboard('{Escape}');
    await user.selectOptions(addPicker(), 'New Custom Weight Table…');
    await user.clear(nameField());
    await user.type(nameField(), 'Bee');
    await user.click(inDialog().getByRole('button', { name: 'Save' }));
    await user.keyboard('{Escape}');
    await user.click(button('Remove Zed'));
    await user.click(button('Remove Bee'));

    expect(groupsOf(addPicker())).toEqual([
      ['Custom', 'Bee', 'Zed'],
      ['Built-in', 'Crit Rate only'],
    ]);
    expect(groupsOf(rowPicker('Atk only'))).toEqual([
      ['Custom', 'Bee', 'Zed'],
      ['Built-in', 'Atk only', 'Crit Rate only'],
    ]);
    const options = within(addPicker()).getAllByRole('option');
    expect(options[options.length - 1]).toHaveTextContent('New Custom Weight Table…');
  });

  it('names blank tables "New Weight Table", then "New Weight Table 2"', async () => {
    const user = open();
    await user.selectOptions(addPicker(), 'New Custom Weight Table…');
    expect(nameField()).toHaveValue('New Weight Table');
    expect(nameField()).toHaveFocus();
    expect(weightField('Crit Rate')).toHaveValue('0');
    await user.click(inDialog().getByRole('button', { name: 'Save' }));
    await user.keyboard('{Escape}');
    expect(rowPicker('New Weight Table')).toBeInTheDocument();
    expect(addPicker()).toHaveFocus();

    await user.selectOptions(addPicker(), 'New Custom Weight Table…');
    expect(nameField()).toHaveValue('New Weight Table 2');
    // Cancel from the add picker creates nothing and closes the dialog.
    await user.click(inDialog().getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(rows()).toHaveLength(1);
  });

  it('offers Edit, Duplicate and Delete on a Custom table', async () => {
    const user = open();
    await duplicateCritRate(user, '12');
    expect(
      inDialog()
        .getAllByRole('button')
        .map((b) => b.textContent || b.getAttribute('aria-label')),
    ).toEqual(['Edit', 'Duplicate', 'Delete', 'Close']);
    expect(inDialog().queryByText(/Built-in tables can't be changed/)).not.toBeInTheDocument();
  });
});

describe('a draft', () => {
  it('is not seen by calculations until saved', async () => {
    const user = open();
    await addCritRate(user);
    await duplicateCritRate(user, '12');
    expect(await within(row(1)).findByText('12.00')).toBeInTheDocument();

    await user.click(inDialog().getByRole('button', { name: 'Edit' }));
    await user.clear(weightField('Crit Rate'));
    await user.type(weightField('Crit Rate'), '3');
    expect(echoScoreCell(1)).toHaveTextContent('12.00');

    await user.click(inDialog().getByRole('button', { name: 'Save' }));
    expect(await within(row(1)).findByText('3.00')).toBeInTheDocument();
    expect(inDialog().getAllByRole('definition')[0]).toHaveTextContent('3');
  });

  it('shows a rejected field’s problem at the field and blocks Save', async () => {
    const user = open();
    await user.selectOptions(addPicker(), 'New Custom Weight Table…');
    await user.type(weightField('Flat HP'), '-1');
    expect(weightField('Flat HP')).toHaveAccessibleDescription('Enter a number of 0 or more.');
    expect(inDialog().getByRole('button', { name: 'Save' })).toBeDisabled();

    await user.clear(weightField('Flat HP'));
    expect(weightField('Flat HP')).not.toHaveAccessibleDescription();
    await user.clear(nameField());
    expect(nameField()).toHaveAccessibleDescription('Enter a name.');
    await user.type(nameField(), 'crit rate ONLY');
    expect(nameField()).toHaveAccessibleDescription("'crit rate ONLY' is already taken.");
    expect(inDialog().getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('accepts at most 40 characters in the name, cutting a paste at 40', async () => {
    const user = open();
    await user.selectOptions(addPicker(), 'New Custom Weight Table…');
    await user.clear(nameField());
    await user.paste('x'.repeat(50));
    expect(nameField()).toHaveValue('x'.repeat(40));
  });

  it('treats Escape with unsaved edits as Cancel, with no prompt', async () => {
    const user = open();
    await duplicateCritRate(user, '12');
    await user.click(inDialog().getByRole('button', { name: 'Edit' }));
    await user.type(weightField('Crit Rate'), '5');
    await user.keyboard('{Escape}');

    // Back to the saved table, unchanged.
    expect(inDialog().queryAllByRole('textbox')).toHaveLength(0);
    expect(inDialog().getAllByRole('definition')[0]).toHaveTextContent('12');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('renaming and deleting a Custom table', () => {
  it('carries the targets and list rows remembered under the old name to the new one', async () => {
    const user = open();
    await duplicateCritRate(user, '12');
    await user.keyboard('{Escape}');
    await user.type(targetBox('Crit Rate only (copy)'), '20');

    await user.click(button('Weights of Crit Rate only (copy)'));
    await user.click(inDialog().getByRole('button', { name: 'Edit' }));
    await user.clear(nameField());
    await user.type(nameField(), 'Mine');
    await user.click(inDialog().getByRole('button', { name: 'Save' }));
    await user.keyboard('{Escape}');

    expect(rows()).toHaveLength(2);
    expect(rowPicker('Mine')).toBeInTheDocument();
    expect(targetBox('Mine')).toHaveValue('20');
    expect(resultsHeading()).toHaveTextContent('MineCustom');
    expect(focusedRowIndex()).toBe(1);
  });

  it('asks first, then deletes with no undo, forgetting its targets and its rows', async () => {
    const user = open();
    await duplicateCritRate(user, '12');
    await user.keyboard('{Escape}');
    await user.type(targetBox('Crit Rate only (copy)'), '20');

    await user.click(button('Weights of Crit Rate only (copy)'));
    await user.click(inDialog().getByRole('button', { name: 'Delete' }));
    expect(
      inDialog().getByText("Delete 'Crit Rate only (copy)'? This can't be undone."),
    ).toBeInTheDocument();
    await user.click(inDialog().getByRole('button', { name: 'Cancel' }));
    expect(inDialog().getByRole('button', { name: 'Edit' })).toBeInTheDocument();

    await user.click(inDialog().getByRole('button', { name: 'Delete' }));
    await user.click(inDialog().getByRole('button', { name: 'Delete' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(rows()).toHaveLength(1);
    expect(focusedRowIndex()).toBe(0);
    expect(groupsOf(addPicker())).toEqual([['Built-in', 'Atk only']]);

    // A new table of the same name starts with empty targets.
    await user.click(button('Weights of Crit Rate only'));
    await user.click(inDialog().getByRole('button', { name: 'Duplicate' }));
    await user.click(inDialog().getByRole('button', { name: 'Save' }));
    await user.keyboard('{Escape}');
    expect(targetBox('Crit Rate only (copy)')).toHaveValue('');
  });
});
