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

function open(tables: readonly WeightTableData[] = TABLES) {
  const user = userEvent.setup();
  render(<EchoEvaluationTab calculator={inProcessCalculator()} builtInTables={tables} />);
  return user;
}

// Ties (ATK% and Liberation at 2) and zeros (Crit Rate, Flat HP) to sort.
const MIXED: WeightTableData = {
  name: 'Mixed',
  weights: { Critical_Rate: 0, Liberation: 2, Atk_Percent: 2, Energy_Regen: 4, Hp_Flat: 0 },
};
/** MIXED's Substats heaviest first, ties in the usual order. */
const MIXED_ORDER = [
  'Energy Regen',
  'ATK%',
  'Resonance Liberation DMG Bonus',
  'Crit Rate',
  'Crit Damage',
  'Flat ATK',
  'HP%',
  'Flat HP',
  'DEF%',
  'Flat DEF',
  'Basic Attack DMG Bonus',
  'Heavy Attack DMG Bonus',
  'Resonance Skill DMG Bonus',
];
const ALL_ZEROS: WeightTableData = { name: 'All zeros', weights: {} };

/** The weights view's Substats, top to bottom. */
const viewedSubstats = () =>
  inDialog()
    .getAllByRole('term')
    .map((term) => term.textContent);
/** The weights view's row of a Substat. */
const viewRow = (substat: string) =>
  inDialog()
    .getAllByRole('term')
    .find((term) => term.textContent === substat)?.parentElement as HTMLElement;
/** The width of a row's bar, or null when it has none. */
const barWidth = (substat: string) =>
  viewRow(substat).querySelector<HTMLElement>('[data-bar] > *')?.style.width ?? null;
/** The weight fields' labels, top to bottom. */
const editorSubstats = () =>
  inDialog()
    .getAllByRole<HTMLInputElement>('textbox')
    .slice(1)
    .map((field) => field.labels?.[0]?.textContent);

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
/** The dialog's buttons in order, by their accessible names. */
const dialogButtons = () =>
  inDialog()
    .getAllByRole('button')
    .map((b) => b.getAttribute('aria-label') ?? b.textContent);
/** A click on the dimmed area outside the dialog: it lands on the <dialog> element itself. */
const clickOutside = (user: User) => user.click(dialog());
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
    expect(dialogButtons()).toEqual(['Duplicate', 'Close']);
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
    expect(dialogButtons()).toEqual(['Delete', 'Edit', 'Duplicate', 'Close']);
    expect(inDialog().queryByText(/Built-in tables can't be changed/)).not.toBeInTheDocument();
  });
});

describe('the weights view', () => {
  it('lists the 13 Substats in one column, heaviest first, ties in the usual order', async () => {
    const user = open([MIXED]);
    await user.selectOptions(addPicker(), 'Mixed');
    await user.click(button('Weights of Mixed'));
    expect(viewedSubstats()).toEqual(MIXED_ORDER);
  });

  it('scales each bar to the heaviest weight, and mutes a zero with no bar', async () => {
    const user = open([MIXED]);
    await user.selectOptions(addPicker(), 'Mixed');
    await user.click(button('Weights of Mixed'));
    expect(barWidth('Energy Regen')).toBe('100%');
    expect(barWidth('ATK%')).toBe('50%');
    expect(barWidth('Crit Rate')).toBeNull();
    expect(viewRow('Crit Rate')).toHaveAttribute('data-zero');
    expect(viewRow('ATK%')).not.toHaveAttribute('data-zero');
  });

  it('shows no bars for a table that is all zeros', async () => {
    const user = open([ALL_ZEROS]);
    await user.selectOptions(addPicker(), 'All zeros');
    await user.click(button('Weights of All zeros'));
    expect(dialog().querySelectorAll('[data-bar]')).toHaveLength(0);
    expect(inDialog().getAllByRole('term')).toHaveLength(13);
  });
});

describe('the editor’s order', () => {
  it('keeps the view’s order on Duplicate and Edit, also while typing, and sorts again after Save', async () => {
    const user = open([MIXED]);
    await user.selectOptions(addPicker(), 'Mixed');
    await user.click(button('Weights of Mixed'));
    await user.click(inDialog().getByRole('button', { name: 'Duplicate' }));
    expect(editorSubstats()).toEqual(MIXED_ORDER);

    await user.clear(weightField('Energy Regen'));
    await user.type(weightField('Crit Damage'), '9');
    expect(editorSubstats()).toEqual(MIXED_ORDER);
    await user.click(inDialog().getByRole('button', { name: 'Save' }));
    const saved = [
      'Crit Damage',
      'ATK%',
      'Resonance Liberation DMG Bonus',
      'Crit Rate',
      'Flat ATK',
      'HP%',
      'Flat HP',
      'DEF%',
      'Flat DEF',
      'Energy Regen',
      'Basic Attack DMG Bonus',
      'Heavy Attack DMG Bonus',
      'Resonance Skill DMG Bonus',
    ];
    expect(viewedSubstats()).toEqual(saved);

    // Edit opens in the order now shown.
    await user.click(inDialog().getByRole('button', { name: 'Edit' }));
    expect(editorSubstats()).toEqual(saved);
  });

  it('offers a new blank table in the usual Substat order', async () => {
    const user = open([MIXED]);
    await user.selectOptions(addPicker(), 'New Custom Weight Table…');
    expect(editorSubstats()).toEqual([
      'Crit Rate',
      'Crit Damage',
      'ATK%',
      'Flat ATK',
      'HP%',
      'Flat HP',
      'DEF%',
      'Flat DEF',
      'Energy Regen',
      'Basic Attack DMG Bonus',
      'Heavy Attack DMG Bonus',
      'Resonance Skill DMG Bonus',
      'Resonance Liberation DMG Bonus',
    ]);
  });
});

describe('closing the dialog', () => {
  it('has no ✕ on any screen, and puts the main action on the far right', async () => {
    const user = open();
    await duplicateCritRate(user, '12');
    expect(dialogButtons()).toEqual(['Delete', 'Edit', 'Duplicate', 'Close']);
    expect(inDialog().getByRole('button', { name: 'Close' })).toHaveTextContent('Close');

    await user.click(inDialog().getByRole('button', { name: 'Edit' }));
    expect(dialogButtons()).toEqual(['Cancel', 'Save']);
    await user.click(inDialog().getByRole('button', { name: 'Cancel' }));

    await user.click(inDialog().getByRole('button', { name: 'Delete' }));
    expect(dialogButtons()).toEqual(['Cancel', 'Delete']);
  });

  it('closes on a click outside while viewing, giving focus back to its opener', async () => {
    const user = open();
    await user.selectOptions(addPicker(), 'Crit Rate only');
    await user.click(button('Weights of Crit Rate only'));
    // A click inside leaves it open.
    await user.click(inDialog().getByRole('heading'));
    expect(dialog()).toBeInTheDocument();

    await clickOutside(user);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button('Weights of Crit Rate only')).toHaveFocus();
  });

  it('closes on a click outside while asking to delete, deleting nothing', async () => {
    const user = open();
    await duplicateCritRate(user, '12');
    await user.keyboard('{Escape}');
    await user.click(button('Weights of Crit Rate only (copy)'));
    await user.click(inDialog().getByRole('button', { name: 'Delete' }));

    await clickOutside(user);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button('Weights of Crit Rate only (copy)')).toHaveFocus();
    expect(rows()).toHaveLength(2);
  });

  it('treats a click outside with unsaved edits as Cancel, with no prompt', async () => {
    const user = open();
    await duplicateCritRate(user, '12');
    await user.click(inDialog().getByRole('button', { name: 'Edit' }));
    await user.type(weightField('Crit Rate'), '5');

    await clickOutside(user);
    expect(inDialog().queryAllByRole('textbox')).toHaveLength(0);
    expect(inDialog().getAllByRole('definition')[0]).toHaveTextContent('12');
  });

  it('closes on a click outside a draft with no edits, as Escape does', async () => {
    const user = open();
    await user.selectOptions(addPicker(), 'Crit Rate only');
    await user.click(button('Weights of Crit Rate only'));
    await user.click(inDialog().getByRole('button', { name: 'Duplicate' }));

    await clickOutside(user);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(rows()).toHaveLength(1);
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

  it('closes on Escape while asking, deleting nothing, and gives focus back to its opener', async () => {
    const user = open();
    await duplicateCritRate(user, '12');
    await user.keyboard('{Escape}');

    await user.click(button('Weights of Crit Rate only (copy)'));
    await user.click(inDialog().getByRole('button', { name: 'Delete' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button('Weights of Crit Rate only (copy)')).toHaveFocus();
    expect(rows()).toHaveLength(2);
  });
});
