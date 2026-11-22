import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { WeightTableData } from '../catalogue/catalogue';
import { inProcessCalculator } from '../test/inProcessCalculator';
import { EchoEvaluationTab } from '../test/EchoEvaluationTab';

// Small tables, so each calculation is instant. Only Crit Rate is weighted: 6.0 per Reference Roll (7.5).
const TABLES: readonly WeightTableData[] = [
  { name: 'Crit Rate only', weights: { Critical_Rate: 6 } },
  { name: 'Atk only', weights: { Atk_Percent: 1 } },
];

function open() {
  const user = userEvent.setup();
  render(<EchoEvaluationTab calculator={inProcessCalculator()} builtInTables={TABLES} />);
  return user;
}

const slots = () =>
  within(screen.getByRole('list', { name: 'Tune slots' })).getAllByRole('listitem');
const slot = (index: number) => slots()[index] as HTMLElement;
const button = (name: string | RegExp) => screen.getByRole('button', { name });

async function addSubstat(user: ReturnType<typeof userEvent.setup>, type: string, value: string) {
  await user.click(button(/^Add the Substat revealed at/));
  await user.click(button(type));
  await user.click(button(value));
}

async function chooseTable(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.selectOptions(screen.getByRole('combobox', { name: 'Add a Weight Table' }), name);
}

const box = (label: string) => screen.getByRole('group', { name: label });

describe('Your Echo', () => {
  it('starts with five empty slots: the first to add, the rest not tuned yet', () => {
    open();
    expect(screen.getByText('Tune Stage 0/5 (+0)')).toBeInTheDocument();
    const [first, ...later] = slots();
    expect(within(first as HTMLElement).getByRole('button')).toHaveAccessibleName(
      'Add the Substat revealed at +5',
    );
    expect(later.map((slot) => slot.textContent)).toEqual([
      '+10not tuned yet',
      '+15not tuned yet',
      '+20not tuned yet',
      '+25not tuned yet',
    ]);
  });

  it('adds a Substat by type then value, before any table is chosen', async () => {
    const user = open();
    await user.click(button('Add the Substat revealed at +5'));
    // The grid of types opens inside the slot, with no heading, and focus on the first type.
    expect(within(slot(0)).getAllByRole('button')).toHaveLength(13 + 1);
    expect(within(slot(0)).queryByRole('heading')).not.toBeInTheDocument();
    expect(document.activeElement).toHaveAccessibleName('Crit Rate');

    await user.click(button('Crit Rate'));
    expect(document.activeElement).toHaveAccessibleName('6.3%');
    expect(
      within(slot(0))
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['6.3%', '6.9%', '7.5%', '8.1%', '8.7%', '9.3%', '9.9%', '10.5%', 'Back', 'Cancel']);

    await user.click(button('8.1%'));
    expect(slot(0)).toHaveTextContent('Crit Rate');
    expect(slot(0)).toHaveTextContent('8.1%');
    expect(screen.getByText('Tune Stage 1/5 (+5)')).toBeInTheDocument();
    // Focus moves on to the next empty slot's Add button.
    expect(document.activeElement).toBe(button('Add the Substat revealed at +10'));
  });

  it('offers only the types not already on the Echo, and flat types by their distinct values', async () => {
    const user = open();
    await addSubstat(user, 'Crit Rate', '8.1%');
    await user.click(button('Add the Substat revealed at +10'));
    expect(screen.queryByRole('button', { name: 'Crit Rate' })).not.toBeInTheDocument();
    await user.click(button('Flat ATK'));
    expect(
      within(slot(1))
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['30', '40', '50', '60', 'Back', 'Cancel']);
  });

  it('steps back to the types, and cancels back to the opener', async () => {
    const user = open();
    await user.click(button('Add the Substat revealed at +5'));
    await user.click(button('HP%'));
    await user.click(button('Back'));
    expect(button('Crit Rate')).toBeInTheDocument();
    await user.click(button('Cancel'));
    expect(screen.queryByRole('button', { name: 'Crit Rate' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(button('Add the Substat revealed at +5'));
  });

  it('closes the picker on Escape and returns focus to the opener', async () => {
    const user = open();
    await user.click(button('Add the Substat revealed at +5'));
    await user.click(button('HP%'));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('button', { name: '8.6%' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(button('Add the Substat revealed at +5'));
  });

  it('changes a Substat in place with the pencil, the current pick marked', async () => {
    const user = open();
    await addSubstat(user, 'Crit Rate', '8.1%');
    await addSubstat(user, 'HP%', '8.6%');

    await user.click(button('Change the Substat at +5'));
    // The Echo's own other types stay out; the current type is offered, marked and focused.
    expect(screen.queryByRole('button', { name: 'HP%' })).not.toBeInTheDocument();
    expect(button('Crit Rate')).toHaveAttribute('aria-current', 'true');
    expect(document.activeElement).toBe(button('Crit Rate'));

    await user.click(button('Crit Rate'));
    expect(button('8.1%')).toHaveAttribute('aria-current', 'true');
    await user.click(button('9.9%'));
    expect(slot(0)).toHaveTextContent('Crit Rate');
    expect(slot(0)).toHaveTextContent('9.9%');
    expect(slot(1)).toHaveTextContent('HP%');
  });

  it('removes a Substat, moves the later ones up and focuses the next empty Add button', async () => {
    const user = open();
    await addSubstat(user, 'Crit Rate', '8.1%');
    await addSubstat(user, 'HP%', '8.6%');
    await addSubstat(user, 'Flat DEF', '50');

    await user.click(button('Remove Crit Rate'));
    expect(slot(0)).toHaveTextContent('HP%');
    expect(slot(1)).toHaveTextContent('Flat DEF');
    expect(screen.getByText('Tune Stage 2/5 (+10)')).toBeInTheDocument();
    expect(document.activeElement).toBe(button('Add the Substat revealed at +15'));
  });

  it('moves focus to the slot’s pencil once no slot is empty', async () => {
    const user = open();
    await addSubstat(user, 'Crit Rate', '8.1%');
    await addSubstat(user, 'HP%', '8.6%');
    await addSubstat(user, 'Flat DEF', '50');
    await addSubstat(user, 'Flat HP', '430');
    await addSubstat(user, 'Energy Regen', '9.2%');
    expect(screen.getByText('Tune Stage 5/5 (+25)')).toBeInTheDocument();
    expect(document.activeElement).toBe(button('Change the Substat at +25'));
  });
});

describe('Results for the table in focus', () => {
  it('shows only the first-open prompt while no table is listed', () => {
    open();
    expect(
      screen.getByText('Pick a Substat Weight Table for your Resonator below.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Each table determines how much each Substat is worth to one Resonator. You can add more than one and switch between them.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Echo Score' })).not.toBeInTheDocument();
  });

  it('lists the built-ins alphabetically in the add picker', () => {
    open();
    const picker = screen.getByRole('combobox', { name: 'Add a Weight Table' });
    expect(
      within(picker)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Choose a Weight Table…', 'Atk only', 'Crit Rate only', 'New Custom Weight Table…']);
  });

  it('lists a chosen table with empty targets and shows its eight boxes', async () => {
    const user = open();
    await chooseTable(user, 'Crit Rate only');

    expect(screen.getByRole('heading', { name: 'Crit Rate only' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Target Score for Crit Rate only' })).toHaveValue(
      '',
    );
    expect(screen.getByRole('textbox', { name: 'ER Target Score for Crit Rate only' })).toHaveValue(
      '',
    );
    expect(await within(box('Echo Score')).findByText('0.00')).toBeInTheDocument();
    expect(box('Target Chance')).toHaveTextContent('—Set a Target Score below');
    expect(box('ER Target Chance')).toHaveTextContent('—Set an ER Target Score below');
    // Top Percent always has a number, even at Echo Score 0.
    expect(box('Top Percent')).toHaveTextContent(/^Top Percent\s*Top \d+\.\d\d%$/);
    expect(box('ER Top Percent')).toHaveTextContent('—No Energy Regen');
    for (const label of ['Median Echo Score', 'Average Echo Score', 'Best Echo Score'])
      expect(box(label)).toHaveTextContent(/\d+\.\d\d$/);
  });

  it('recalculates on every keystroke in a target box', async () => {
    const user = open();
    await addSubstat(user, 'Crit Rate', '7.5%');
    await chooseTable(user, 'Crit Rate only');
    await user.type(screen.getByRole('textbox', { name: 'Target Score for Crit Rate only' }), '6');
    // Crit Rate 7.5 already scores 6, and no more Crit Rate can come.
    expect(await within(box('Target Chance')).findByText('100.00%')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Target Score for Crit Rate only' }), '1');
    expect(await within(box('Target Chance')).findByText('0%')).toBeInTheDocument();
  });

  it('gives a chance for a fresh Echo', async () => {
    const user = open();
    await chooseTable(user, 'Crit Rate only');
    await user.type(screen.getByRole('textbox', { name: 'Target Score for Crit Rate only' }), '6');
    // 5/13 of fully tuned Echoes have Crit Rate, and 5333 of its 9999 tier weight is 7.5 or more.
    expect(await within(box('Target Chance')).findByText('20.51%')).toBeInTheDocument();
  });

  it('treats an invalid target as empty and says so at the field', async () => {
    const user = open();
    await chooseTable(user, 'Crit Rate only');
    const target = screen.getByRole('textbox', { name: 'Target Score for Crit Rate only' });
    await user.type(target, '-1');
    expect(target).toHaveAccessibleDescription('Enter a number of 0 or more.');
    expect(target).toHaveAttribute('aria-invalid', 'true');
    expect(box('Target Chance')).toHaveTextContent('—Set a Target Score below');

    await user.clear(target);
    await user.type(target, '2.5');
    expect(target).not.toHaveAttribute('aria-invalid', 'true');
    expect(await within(box('Target Chance')).findByText(/%$/)).toBeInTheDocument();
  });

  it('shows the ER Top Percent once the Echo has Energy Regen', async () => {
    const user = open();
    await chooseTable(user, 'Crit Rate only');
    await addSubstat(user, 'Energy Regen', '9.2%');
    expect(await within(box('ER Top Percent')).findByText(/^Top /)).toBeInTheDocument();
  });

  it('gives verdicts and the final Echo Score at 5/5', async () => {
    const user = open();
    await chooseTable(user, 'Crit Rate only');
    await user.type(screen.getByRole('textbox', { name: 'Target Score for Crit Rate only' }), '6');
    await addSubstat(user, 'Crit Rate', '7.5%');
    await addSubstat(user, 'HP%', '8.6%');
    await addSubstat(user, 'Flat DEF', '50');
    await addSubstat(user, 'Flat HP', '430');
    await addSubstat(user, 'Crit Damage', '15%');

    expect(await screen.findByRole('group', { name: 'Target Score' })).toHaveTextContent('Reached');
    expect(box('ER Target Score')).toHaveTextContent('—No Energy Regen');
    for (const label of [
      'Echo Score',
      'Median Echo Score',
      'Average Echo Score',
      'Best Echo Score',
    ])
      expect(box(label)).toHaveTextContent('6.00');
  });

  it('says Not reached at 5/5 below the target', async () => {
    const user = open();
    await chooseTable(user, 'Crit Rate only');
    await user.type(screen.getByRole('textbox', { name: 'Target Score for Crit Rate only' }), '7');
    await user.type(
      screen.getByRole('textbox', { name: 'ER Target Score for Crit Rate only' }),
      '1',
    );
    await addSubstat(user, 'Crit Rate', '7.5%');
    await addSubstat(user, 'HP%', '8.6%');
    await addSubstat(user, 'Flat DEF', '50');
    await addSubstat(user, 'Flat HP', '430');
    await addSubstat(user, 'Energy Regen', '9.2%');

    expect(await screen.findByRole('group', { name: 'Target Score' })).toHaveTextContent(
      'Not reached',
    );
    expect(box('ER Target Score')).toHaveTextContent('Reached');
  });
});

describe('Term tooltips', () => {
  const describedTerm = (name: string, description: string) => {
    const terms = screen.getAllByRole('button', { name });
    expect(terms.length).toBeGreaterThan(0);
    for (const term of terms) expect(term).toHaveAccessibleDescription(description);
  };

  it('explains the Substat Weight Table, the targets and every result in the words of ticket 17', async () => {
    const user = open();
    await chooseTable(user, 'Crit Rate only');
    describedTerm('Weight Table', 'Determines how much each Substat is worth.');
    describedTerm('Target Score', 'The Echo Score you aim for in a fully tuned Echo.');
    describedTerm(
      'ER Target Score',
      'The Echo Score you aim for in a fully tuned Echo that also has Energy Regen.',
    );
    describedTerm(
      'Target Chance',
      'The chance that this Echo, once fully tuned, reaches your Target Score.',
    );
    describedTerm(
      'ER Target Chance',
      'The chance that this Echo, once fully tuned, has Energy Regen and reaches your ER Target Score.',
    );
    describedTerm(
      'Echo Score',
      "The Echo's Substats added up, each counted by its weight in this table. Higher is better.",
    );
    describedTerm(
      'Top Percent',
      'The share of all fully tuned Echoes with a higher Echo Score. Top 5% means only 1 in 20 is better.',
    );
    describedTerm(
      'ER Top Percent',
      'The share of all fully tuned Echoes that have Energy Regen and a higher Echo Score.',
    );
  });

  it('keeps each result box named by its term', async () => {
    const user = open();
    await chooseTable(user, 'Crit Rate only');
    expect(within(box('Echo Score')).getByRole('button', { name: 'Echo Score' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Substat Weight Tables' })).toBeVisible();
  });
});

describe('Echo distribution', () => {
  const chart = () => screen.queryByRole('img', { name: /^Echo distribution/ });

  it('is shown once a table is listed, spanning every listed table and its targets', async () => {
    const user = open();
    expect(chart()).not.toBeInTheDocument();

    await chooseTable(user, 'Atk only');
    await chooseTable(user, 'Crit Rate only');
    // A fresh Echo finishes from 0 up to the best Crit Rate roll: 6 × 10.5 / 7.5 = 8.4.
    await waitFor(() =>
      expect(chart()).toHaveAccessibleName(
        'Echo distribution for Crit Rate only: final Echo Score from 0.0 to 8.4.',
      ),
    );

    await user.type(screen.getByRole('textbox', { name: 'Target Score for Atk only' }), '10');
    await waitFor(() =>
      expect(chart()).toHaveAccessibleName(
        'Echo distribution for Crit Rate only: final Echo Score from 0.0 to 10.0.',
      ),
    );
  });
});
