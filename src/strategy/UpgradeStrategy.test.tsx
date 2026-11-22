import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import type { Calculator } from '../calculation/newestInputWins';
import type { WeightTableData } from '../catalogue/catalogue';
import { inProcessCalculator } from '../test/inProcessCalculator';

// Small tables, so each calculation is instant. Only Crit Rate is weighted: 6.0 per Reference Roll (7.5).
const TABLES: readonly WeightTableData[] = [
  { name: 'Crit Rate only', weights: { Critical_Rate: 6 } },
  { name: 'Atk only', weights: { Atk_Percent: 1 } },
];

type User = ReturnType<typeof userEvent.setup>;

function open(calculator: Calculator = inProcessCalculator()) {
  window.location.hash = '#strategy';
  const user = userEvent.setup();
  render(
    <App buildDate="2026-11-20T09:30:00.000Z" calculator={calculator} builtInTables={TABLES} />,
  );
  return user;
}

function goTo(hash: string) {
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

afterEach(() => {
  window.location.hash = '';
});

const picker = () => screen.getByRole('combobox', { name: 'Substat Weight Table' });
const stage = (n: number) => screen.getByRole('region', { name: `Tune Stage ${n}/5 (+${n * 5})` });
const results = () => screen.getByRole('region', { name: 'Results' });
const NO_TABLE = 'Pick a Substat Weight Table above to build an Upgrade Strategy.';

/** Opens Upgrade Strategy with this table and, in place of the first visit's "Crit first", an empty strategy. */
async function openWithTable(name = 'Crit Rate only') {
  const user = open();
  await user.selectOptions(picker(), name);
  await loadExample(user, 'Keep every Echo');
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Replace' }));
  // Every Echo passes an empty strategy.
  await within(results()).findByText('100.0%');
  return user;
}

const examplePicker = () => screen.getByRole('combobox', { name: 'Start from an example' });

async function loadExample(user: User, name: string) {
  await user.selectOptions(examplePicker(), name);
}

/** "+ add a rule" at a Tune Stage, then picks these Substats for the new Substat Count rule. */
async function addCountRule(user: User, n: number, substats: string[]) {
  await user.click(within(stage(n)).getByRole('button', { name: '+ add a rule' }));
  await pickSubstats(
    user,
    within(stage(n))
      .getAllByRole('button', { name: /pick Substats/ })
      .at(-1) as HTMLElement,
    substats,
  );
}

async function pickSubstats(user: User, opener: HTMLElement, substats: string[]) {
  await user.click(opener);
  const popover = screen.getByRole('group', { name: 'Substats' });
  for (const name of substats) await user.click(within(popover).getByRole('checkbox', { name }));
  await user.keyboard('{Escape}');
}

describe('the header', () => {
  it('reads "Choose a Weight Table…" only until a table is picked, with no way back to none', async () => {
    const user = open();
    expect(picker()).toHaveDisplayValue('Choose a Weight Table…');
    await user.selectOptions(picker(), 'Atk only');
    expect(picker()).toHaveDisplayValue('Atk only');
    expect(within(picker()).queryByRole('option', { name: 'Choose a Weight Table…' })).toBeNull();
  });

  it('offers the two groups, then "New Custom Weight Table…"', () => {
    open();
    const groups = within(picker()).getAllByRole('group');
    expect(groups.map((group) => group.getAttribute('label'))).toEqual(['Built-in']);
    const options = within(picker()).getAllByRole('option');
    expect(options.at(-1)).toHaveTextContent('New Custom Weight Table…');
  });

  it('opens the weights of the picked table from the sliders beside the picker', async () => {
    const user = await openWithTable('Atk only');
    await user.click(screen.getByRole('button', { name: 'Weights of Atk only' }));
    expect(within(screen.getByRole('dialog')).getByRole('heading')).toHaveTextContent('Atk only');
  });

  it('makes a new Custom table saved from the picker the strategy’s table', async () => {
    const user = open();
    await user.selectOptions(picker(), 'New Custom Weight Table…');
    const dialog = screen.getByRole('dialog');
    await user.clear(within(dialog).getByRole('textbox', { name: 'Name' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Mine');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    await user.keyboard('{Escape}');
    expect(picker()).toHaveDisplayValue('Mine');
    expect(
      within(picker())
        .getAllByRole('group')
        .map((g) => g.getAttribute('label')),
    ).toEqual(['Custom', 'Built-in']);
  });
});

describe('a renamed Custom table', () => {
  async function saveCustomTable(user: User, name: string) {
    const dialog = screen.getByRole('dialog');
    await user.clear(within(dialog).getByRole('textbox', { name: 'Name' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), name);
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
  }

  async function rename(user: User, to: string) {
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Edit' }));
    await saveCustomTable(user, to);
    await user.keyboard('{Escape}');
  }

  it('stays the strategy’s table when renamed on Echo Evaluation', async () => {
    const user = open();
    goTo('#evaluation');
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Add a Weight Table' }),
      'New Custom Weight Table…',
    );
    await saveCustomTable(user, 'Mine');
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Weights of Mine' }));
    await rename(user, 'Ours');
    goTo('#strategy');
    expect(picker()).toHaveDisplayValue('Ours');
  });

  it('stays listed on Echo Evaluation when renamed on Upgrade Strategy', async () => {
    const user = open();
    await user.selectOptions(picker(), 'New Custom Weight Table…');
    await saveCustomTable(user, 'Mine');
    await user.keyboard('{Escape}');
    goTo('#evaluation');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Add a Weight Table' }), 'Mine');
    goTo('#strategy');
    await user.click(screen.getByRole('button', { name: 'Weights of Mine' }));
    await rename(user, 'Ours');
    expect(picker()).toHaveDisplayValue('Ours');
    goTo('#evaluation');
    expect(
      screen.getByRole('combobox', { name: 'Swap Ours for another Weight Table' }),
    ).toBeInTheDocument();
  });
});

describe('with no Weight Table', () => {
  it('shows one line instead of the stages and results, and disables the example picker and Compare', () => {
    open();
    expect(screen.getByText(NO_TABLE)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Tune Stage/ })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Results' })).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Start from an example' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Compare with another strategy' })).toBeDisabled();
  });

  it('keeps the strategy underneath while its table is gone', async () => {
    const user = open();
    await user.selectOptions(picker(), 'New Custom Weight Table…');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }));
    await addCountRule(user, 3, ['Crit Rate']);
    await user.click(screen.getByRole('button', { name: /^Weights of / }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(screen.getByText(NO_TABLE)).toBeInTheDocument();
    expect(picker()).toHaveDisplayValue('Choose a Weight Table…');
    await user.selectOptions(picker(), 'Atk only');
    expect(within(stage(3)).getByRole('button', { name: 'Crit Rate' })).toBeInTheDocument();
  });

  it('calculates nothing', async () => {
    const calculator = inProcessCalculator();
    const asked = vi.spyOn(calculator, 'calculateUpgradeStrategy');
    window.location.hash = '#strategy';
    const user = userEvent.setup();
    render(
      <App buildDate="2026-11-20T09:30:00.000Z" calculator={calculator} builtInTables={TABLES} />,
    );
    expect(asked).not.toHaveBeenCalled();
    await user.selectOptions(picker(), 'Atk only');
    expect(asked).toHaveBeenCalledTimes(1);
  });

  it('picks the table added on Echo Evaluation', async () => {
    const user = open();
    goTo('#evaluation');
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Add a Weight Table' }),
      'Atk only',
    );
    goTo('#strategy');
    expect(picker()).toHaveDisplayValue('Atk only');
    expect(screen.queryByText(NO_TABLE)).toBeNull();
  });

  it('keeps its own table when Echo Evaluation adds another', async () => {
    const user = await openWithTable('Crit Rate only');
    goTo('#evaluation');
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Add a Weight Table' }),
      'Atk only',
    );
    goTo('#strategy');
    expect(picker()).toHaveDisplayValue('Crit Rate only');
  });
});

describe('the stages', () => {
  it('shows all five, each with nothing discarded and only "+ add a rule" while empty', async () => {
    await openWithTable();
    for (const n of [1, 2, 3, 4, 5]) {
      expect(within(stage(n)).getByRole('heading')).toHaveTextContent(
        `Tune Stage ${n}/5 (+${n * 5})`,
      );
      expect(within(stage(n)).getByText('nothing discarded')).toBeInTheDocument();
      expect(
        within(stage(n))
          .getAllByRole('button')
          .map((b) => b.textContent),
      ).toEqual(['+ add a rule']);
    }
  });

  it('builds a one-rule strategy and shows its Success Rate and Discard Rate', async () => {
    const user = await openWithTable();
    await addCountRule(user, 1, ['Crit Rate']);
    // The first Substat is Crit Rate 1 time in 13.
    expect(await within(results()).findByText('7.7%')).toBeInTheDocument();
    expect(stage(1)).toHaveTextContent('92.3% discarded here');
    expect(
      within(stage(1)).getByRole('button', { name: 'discarded here' }),
    ).toHaveAccessibleDescription(
      'The share of all Echoes that are discarded at this Tune Stage, not of those that reached it.',
    );
    expect(stage(2)).toHaveTextContent('nothing discarded');
  });

  it('lists rules joined by "and" in a box, and boxes after "or", without the term Rule Group', async () => {
    const user = await openWithTable();
    await addCountRule(user, 3, ['Crit Rate']);
    await user.click(within(stage(3)).getByRole('button', { name: '+ and' }));
    await user.click(within(stage(3)).getByRole('button', { name: '+ or' }));
    expect(within(stage(3)).getAllByText('and')).toHaveLength(1);
    expect(within(stage(3)).getAllByText('or')).toHaveLength(1);
    expect(within(stage(3)).getAllByRole('combobox', { name: 'Kind of rule' })).toHaveLength(3);
    expect(document.body).not.toHaveTextContent(/Rule Group/);
  });
});

describe('a rule', () => {
  it('starts as at least 1 of no Substats, with focus on its first field', async () => {
    const user = await openWithTable();
    await user.click(within(stage(2)).getByRole('button', { name: '+ add a rule' }));
    const kind = within(stage(2)).getByRole('combobox', { name: 'Kind of rule' });
    expect(kind).toHaveFocus();
    expect(kind).toHaveDisplayValue('Substat Count');
    expect(within(stage(2)).getByRole('combobox', { name: 'How many' })).toHaveDisplayValue('1');
    expect(
      within(stage(2))
        .getAllByRole('option')
        .filter((o) => o.closest('select')?.getAttribute('aria-label') === 'How many')
        .map((o) => o.textContent),
    ).toEqual(['1', '2', '3', '4', '5']);
    expect(stage(2)).toHaveTextContent('at least');
    expect(within(stage(2)).getByRole('button', { name: 'pick Substats' })).toBeInTheDocument();
    expect(stage(2)).toHaveTextContent('Pick at least one Substat.');
  });

  it('reads each kind as a phrase', async () => {
    const user = await openWithTable();
    await user.click(within(stage(1)).getByRole('button', { name: '+ add a rule' }));
    const kind = within(stage(1)).getByRole('combobox', { name: 'Kind of rule' });

    await user.selectOptions(kind, 'Substat Roll');
    expect(within(stage(1)).getByRole('combobox', { name: 'Substat' })).toHaveDisplayValue(
      'Crit Rate',
    );
    const values = within(
      within(stage(1)).getByRole('combobox', { name: 'Lowest value' }),
    ).getAllByRole('option');
    expect(values.map((v) => v.textContent)).toEqual([
      '6.3%',
      '6.9%',
      '7.5%',
      '8.1%',
      '8.7%',
      '9.3%',
      '9.9%',
      '10.5%',
    ]);
    await user.selectOptions(
      within(stage(1)).getByRole('combobox', { name: 'Substat' }),
      'Flat ATK',
    );
    expect(
      within(within(stage(1)).getByRole('combobox', { name: 'Lowest value' }))
        .getAllByRole('option')
        .map((v) => v.textContent),
    ).toEqual(['30', '40', '50', '60']);

    await user.selectOptions(kind, 'Echo Score');
    expect(within(stage(1)).getByRole('textbox', { name: 'Echo Score' })).toBeInTheDocument();
    expect(stage(1)).toHaveTextContent('Enter an Echo Score.');

    await user.selectOptions(kind, 'Target Chance');
    expect(stage(1)).toHaveTextContent(/at least\s*%\s*chance to reach a Target Score of/);
    expect(stage(1)).toHaveTextContent('Enter a chance in %.');
    await user.type(within(stage(1)).getByRole('textbox', { name: 'Chance in %' }), '10');
    expect(stage(1)).toHaveTextContent('Enter a Target Score.');
  });

  it('keeps every kind’s fields when switching kind', async () => {
    const user = await openWithTable();
    await addCountRule(user, 1, ['Crit Rate', 'Crit Damage']);
    const kind = within(stage(1)).getByRole('combobox', { name: 'Kind of rule' });
    await user.selectOptions(kind, 'Echo Score');
    await user.type(within(stage(1)).getByRole('textbox', { name: 'Echo Score' }), '4');
    await user.selectOptions(kind, 'Substat Count');
    expect(
      within(stage(1)).getByRole('button', { name: 'Crit Rate, Crit Damage' }),
    ).toBeInTheDocument();
    await user.selectOptions(kind, 'Echo Score');
    expect(within(stage(1)).getByRole('textbox', { name: 'Echo Score' })).toHaveValue('4');
  });

  it('shows a field error for an invalid number', async () => {
    const user = await openWithTable();
    await user.click(within(stage(1)).getByRole('button', { name: '+ add a rule' }));
    await user.selectOptions(
      within(stage(1)).getByRole('combobox', { name: 'Kind of rule' }),
      'Target Chance',
    );
    const chance = within(stage(1)).getByRole('textbox', { name: 'Chance in %' });
    await user.type(chance, '120');
    expect(chance).toHaveAccessibleDescription('Enter a chance from 0 to 100.');
    expect(chance).toBeInvalid();
    await user.clear(chance);
    await user.type(chance, '20');
    const target = within(stage(1)).getByRole('textbox', { name: 'Target Score' });
    await user.type(target, '-2');
    expect(target).toHaveAccessibleDescription('Enter a number of 0 or more.');
  });

  it('closes the Substat popover on a click outside and when focus leaves it', async () => {
    const user = await openWithTable();
    await user.click(within(stage(1)).getByRole('button', { name: '+ add a rule' }));
    const opener = within(stage(1)).getByRole('button', { name: 'pick Substats' });
    await user.click(opener);
    expect(opener).toHaveAttribute('aria-expanded', 'true');
    await user.click(
      within(screen.getByRole('group', { name: 'Substats' })).getByRole('checkbox', {
        name: 'Crit Rate',
      }),
    );
    await user.click(document.body);
    expect(screen.queryByRole('group', { name: 'Substats' })).toBeNull();

    await user.click(within(stage(1)).getByRole('button', { name: 'Crit Rate' }));
    expect(screen.getByRole('group', { name: 'Substats' })).toBeInTheDocument();
    // Tab through the 13 checkboxes and out.
    for (let i = 0; i < 14; i++) await user.tab();
    expect(screen.queryByRole('group', { name: 'Substats' })).toBeNull();

    await user.click(within(stage(1)).getByRole('button', { name: 'Crit Rate' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('group', { name: 'Substats' })).toBeNull();
    expect(within(stage(1)).getByRole('button', { name: 'Crit Rate' })).toHaveFocus();
  });

  it('is removed by ×, focus going to the rule before it, or to "+ add a rule"; an emptied box goes', async () => {
    const user = await openWithTable();
    await addCountRule(user, 2, ['Crit Rate']);
    await user.click(within(stage(2)).getByRole('button', { name: '+ or' }));
    const removes = () => within(stage(2)).getAllByRole('button', { name: 'Remove this rule' });
    expect(removes()).toHaveLength(2);

    await user.click(removes()[1] as HTMLElement);
    expect(removes()).toHaveLength(1);
    expect(within(stage(2)).queryByText('or')).toBeNull();
    expect(removes()[0]).toHaveFocus();

    await user.click(removes()[0] as HTMLElement);
    expect(within(stage(2)).queryByRole('button', { name: 'Remove this rule' })).toBeNull();
    expect(within(stage(2)).getByRole('button', { name: '+ add a rule' })).toHaveFocus();
  });
});

describe('unfinished rules', () => {
  it('keep the previous results, faded, naming the first Tune Stage with an unfinished rule', async () => {
    const user = await openWithTable();
    await addCountRule(user, 1, ['Crit Rate']);
    await within(results()).findByText('7.7%');
    await user.click(within(stage(4)).getByRole('button', { name: '+ add a rule' }));
    await user.click(within(stage(3)).getByRole('button', { name: '+ add a rule' }));
    expect(results()).toHaveTextContent(
      'Results are from before your last change. Finish the highlighted rule at Tune Stage 3/5 (+15) to update them.',
    );
    expect(within(results()).getByText('7.7%')).toBeInTheDocument();
  });
});

describe('the results', () => {
  it('show the cost per Successful Echo and the Successful Echoes’ Echo Scores', async () => {
    const user = await openWithTable();
    await addCountRule(user, 1, ['Crit Rate']);
    await within(results()).findByText('7.7%');
    expect(within(results()).getByRole('button', { name: 'Success Rate' })).toBeInTheDocument();
    expect(
      within(results()).getByRole('button', { name: 'Average cost per Successful Echo' }),
    ).toHaveAccessibleDescription(
      'What one Successful Echo costs on average, counting the Echoes discarded on the way, after refunds.',
    );
    const row = (label: string) =>
      within(results()).getByRole('row', { name: new RegExp(`^${label}`) });
    expect(row('Echoes started')).toHaveTextContent('13.00');
    expect(row('Echo EXP')).toHaveTextContent(/^Echo EXP[\d,]+$/);
    expect(row('Tuners')).toHaveTextContent(/^Tuners[\d,]+$/);
    expect(row('Shell Credits')).toHaveTextContent(/^Shell Credits[\d,]+$/);
    // Every Successful Echo has Crit Rate and nothing else weighted; the lowest roll, 6.3, scores 6 × 6.3 / 7.5.
    expect(row('Lowest Echo Score of a Successful Echo')).toHaveTextContent('5.04');
    expect(row('Average Echo Score of Successful Echoes')).toHaveTextContent(/\d\.\d\d$/);
  });

  it('say no Echo passes every Tune Stage when none does', async () => {
    const user = await openWithTable();
    await addCountRule(user, 1, ['Crit Rate']);
    await user.selectOptions(within(stage(1)).getByRole('combobox', { name: 'How many' }), '2');
    await waitFor(() => expect(within(results()).getByText('0.0%')).toBeInTheDocument());
    expect(results()).toHaveTextContent('No Echo passes every Tune Stage.');
    expect(within(results()).queryByRole('row')).toBeNull();
  });

  it('recalculate at once on every valid change', async () => {
    const user = await openWithTable();
    await addCountRule(user, 1, ['Crit Rate']);
    await within(results()).findByText('7.7%');
    await pickSubstats(user, within(stage(1)).getByRole('button', { name: 'Crit Rate' }), [
      'Crit Damage',
    ]);
    expect(await within(results()).findByText('15.4%')).toBeInTheDocument();
  });
});

describe('the first visit', () => {
  it('holds "Crit first" with no Weight Table', async () => {
    const user = open();
    expect(picker()).toHaveDisplayValue('Choose a Weight Table…');
    await user.selectOptions(picker(), 'Crit Rate only');
    expect(within(stage(2)).getByRole('combobox', { name: 'How many' })).toHaveDisplayValue('1');
    expect(within(stage(4)).getByRole('combobox', { name: 'How many' })).toHaveDisplayValue('2');
    for (const n of [2, 4])
      expect(
        within(stage(n)).getByRole('button', { name: 'Crit Rate, Crit Damage' }),
      ).toBeInTheDocument();
    for (const n of [1, 3, 5])
      expect(within(stage(n)).queryByRole('combobox', { name: 'Kind of rule' })).toBeNull();
  });
});

/** The in-process calculator, holding back each Top Echo Scores request until `release`. */
function holdingTopScores() {
  const inner = inProcessCalculator();
  const held: (() => void)[] = [];
  const calculator: Calculator = {
    evaluate: (input, onResult) => inner.evaluate(input, onResult),
    calculateUpgradeStrategy: (strategy, input, onResult) =>
      inner.calculateUpgradeStrategy(strategy, input, onResult),
    topEchoScores: (strategy, input, onResult) =>
      held.push(() => inner.topEchoScores(strategy, input, onResult)),
  };
  return {
    calculator,
    release: () => {
      for (const send of held.splice(0)) send();
    },
  };
}

const echoScoreField = (n: number) => within(stage(n)).getByRole('textbox', { name: 'Echo Score' });
const replaceMessage = (name: string) =>
  `Replace your current strategy with '${name}'? This can't be undone.`;

async function replaceWith(user: User, name: string) {
  await loadExample(user, name);
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Replace' }));
}

describe('the example strategies', () => {
  it('are offered after "Choose…"', async () => {
    await openWithTable();
    expect(
      within(examplePicker())
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual([
      'Choose…',
      'Keep every Echo',
      'Crit first',
      'Double crit, or one great crit roll',
      'Chance to reach a Top 5% Echo',
    ]);
    expect(examplePicker()).toHaveDisplayValue('Choose…');
  });

  it('replace an empty strategy without asking', async () => {
    const user = await openWithTable();
    await loadExample(user, 'Crit first');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(stage(4)).getByRole('combobox', { name: 'How many' })).toHaveDisplayValue('2');
    expect(examplePicker()).toHaveDisplayValue('Choose…');
  });

  it('ask before replacing a strategy with rules, and Cancel keeps it', async () => {
    const user = open();
    await user.selectOptions(picker(), 'Crit Rate only');
    await loadExample(user, 'Keep every Echo');
    const dialog = screen.getByRole('dialog', { name: replaceMessage('Keep every Echo') });
    expect(
      within(dialog)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Cancel', 'Replace']);
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(stage(2)).getByRole('combobox', { name: 'Kind of rule' })).toBeInTheDocument();

    await replaceWith(user, 'Keep every Echo');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(stage(2)).queryByRole('combobox', { name: 'Kind of rule' })).toBeNull();
  });

  it('work out Top x% thresholds for the selected table, rounded to 1 decimal', async () => {
    const user = await openWithTable('Crit Rate only');
    await loadExample(user, 'Double crit, or one great crit roll');
    // A Top 10% Echo has Crit Rate 8.1: 6 × 8.1 / 7.5 = 6.48.
    await waitFor(() => expect(echoScoreField(5)).toHaveValue('6.5'));

    await replaceWith(user, 'Chance to reach a Top 5% Echo');
    // A Top 5% Echo has Crit Rate 9.3: 6 × 9.3 / 7.5 = 7.44.
    await waitFor(() => expect(echoScoreField(5)).toHaveValue('7.4'));
    for (const n of [1, 2, 3, 4])
      expect(within(stage(n)).getByRole('textbox', { name: 'Target Score' })).toHaveValue('7.4');
    expect(
      [1, 2, 3, 4].map(
        (n) =>
          (within(stage(n)).getByRole('textbox', { name: 'Chance in %' }) as HTMLInputElement)
            .value,
      ),
    ).toEqual(['5', '8', '12', '20']);
  });

  it('keep their thresholds when the table changes, and recompute them when loaded again', async () => {
    const user = await openWithTable('Crit Rate only');
    await loadExample(user, 'Double crit, or one great crit roll');
    await waitFor(() => expect(echoScoreField(5)).toHaveValue('6.5'));
    await user.selectOptions(picker(), 'Atk only');
    expect(echoScoreField(5)).toHaveValue('6.5');

    await replaceWith(user, 'Double crit, or one great crit roll');
    await waitFor(() => expect(echoScoreField(5)).not.toHaveValue(''));
    expect(echoScoreField(5)).not.toHaveValue('6.5');
  });

  it('leave pending thresholds empty and faded with "Calculating…", and the results wait', async () => {
    const { calculator, release } = holdingTopScores();
    const asked = vi.spyOn(calculator, 'calculateUpgradeStrategy');
    const user = open(calculator);
    await user.selectOptions(picker(), 'Crit Rate only');
    await within(results()).findByText(/%$/);
    const before = asked.mock.calls.length;
    await replaceWith(user, 'Double crit, or one great crit roll');

    expect(echoScoreField(5)).toHaveValue('');
    expect(within(stage(5)).getByText('Calculating…')).toBeInTheDocument();
    expect(stage(5)).not.toHaveTextContent('Enter an Echo Score.');
    expect(results()).not.toHaveTextContent('Results are from before your last change.');
    expect(asked).toHaveBeenCalledTimes(before);

    release();
    await waitFor(() => expect(echoScoreField(5)).toHaveValue('6.5'));
    expect(within(stage(5)).queryByText('Calculating…')).toBeNull();
    expect(asked).toHaveBeenCalledTimes(before + 1);
  });

  it('are worked out for a table chosen while pending, superseding the pending one', async () => {
    const { calculator, release } = holdingTopScores();
    const user = open(calculator);
    await user.selectOptions(picker(), 'Atk only');
    await replaceWith(user, 'Double crit, or one great crit roll');
    release();
    await waitFor(() => expect(echoScoreField(5)).not.toHaveValue(''));
    const forAtkOnly = (echoScoreField(5) as HTMLInputElement).value;
    expect(forAtkOnly).not.toBe('6.5');

    await replaceWith(user, 'Double crit, or one great crit roll');
    await user.selectOptions(picker(), 'Crit Rate only');
    release();
    await waitFor(() => expect(echoScoreField(5)).toHaveValue('6.5'));
  });

  it('are superseded by a newer example loaded while pending', async () => {
    const { calculator, release } = holdingTopScores();
    const user = open(calculator);
    await user.selectOptions(picker(), 'Crit Rate only');
    await replaceWith(user, 'Double crit, or one great crit roll');
    await replaceWith(user, 'Chance to reach a Top 5% Echo');
    release();
    await waitFor(() => expect(echoScoreField(5)).toHaveValue('7.4'));
    expect(within(stage(3)).queryByRole('combobox', { name: 'Substat' })).toBeNull();
  });
});

const strategyPanel = (name: 'A' | 'B') => screen.getByRole('region', { name: `Strategy ${name}` });
const panelStage = (name: 'A' | 'B', n: number) =>
  within(strategyPanel(name)).getByRole('region', { name: `Tune Stage ${n}/5 (+${n * 5})` });
const comparison = () => screen.getByRole('region', { name: 'B compared with A' });
const comparisonRow = (label: string) =>
  within(comparison()).getByRole('row', { name: new RegExp(`^${label}`) });

async function startComparing(user: User) {
  await user.click(screen.getByRole('button', { name: 'Compare with another strategy' }));
}

/** In Strategy B, which starts in Edit: "+ add a rule" at a Tune Stage and these Substats for its new rule. */
async function addCountRuleToB(user: User, n: number, substats: string[]) {
  await user.click(within(panelStage('B', n)).getByRole('button', { name: '+ add a rule' }));
  await pickSubstats(
    user,
    within(panelStage('B', n)).getByRole('button', { name: 'pick Substats' }),
    substats,
  );
}

describe('comparing two strategies', () => {
  it('turns the current strategy into Strategy A and adds an empty Strategy B beside it, at most two', async () => {
    const user = open();
    await user.selectOptions(picker(), 'Crit Rate only');
    await within(results()).findByText(/%$/);
    await startComparing(user);

    // A keeps "Crit first", shown as Done; B is empty, in Edit.
    expect(strategyPanel('A')).toHaveTextContent('at least 2 of Crit Rate, Crit Damage');
    for (const n of [1, 2, 3, 4, 5])
      expect(
        within(panelStage('B', n)).getByRole('button', { name: '+ add a rule' }),
      ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Compare with another strategy' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Results' })).toBeNull();
  });

  it('keeps A and discards B on "Stop comparing"', async () => {
    const user = await openWithTable();
    await addCountRule(user, 2, ['Crit Rate']);
    await startComparing(user);
    await addCountRuleToB(user, 3, ['Crit Damage']);
    await user.click(screen.getByRole('button', { name: 'Stop comparing' }));

    expect(screen.queryByRole('region', { name: 'Strategy B' })).toBeNull();
    expect(within(stage(2)).getByRole('button', { name: 'Crit Rate' })).toBeInTheDocument();
    expect(within(stage(3)).queryByRole('combobox', { name: 'Kind of rule' })).toBeNull();
    // Crit Rate is one of an Echo's first two Substats 2 times in 13.
    await within(results()).findByText('15.4%');

    await startComparing(user);
    expect(
      within(panelStage('B', 3)).getByRole('button', { name: '+ add a rule' }),
    ).toBeInTheDocument();
  });

  it('gives each strategy its own example picker, asking before replacing one with rules', async () => {
    const user = await openWithTable();
    await addCountRule(user, 1, ['Crit Rate']);
    await startComparing(user);
    const examplesOf = (name: 'A' | 'B') =>
      within(strategyPanel(name)).getByRole('combobox', { name: 'Start from an example' });

    await user.selectOptions(examplesOf('B'), 'Crit first');
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.selectOptions(examplesOf('A'), 'Keep every Echo');
    const dialog = screen.getByRole('dialog', { name: replaceMessage('Keep every Echo') });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(strategyPanel('A')).toHaveTextContent('at least 1 of Crit Rate');
    expect(
      within(panelStage('B', 4)).getByRole('button', { name: 'Crit Rate, Crit Damage' }),
    ).toBeInTheDocument();
  });

  it('switches each strategy between Edit, like the one-strategy editor, and Done, a summary', async () => {
    const user = await openWithTable();
    await addCountRule(user, 1, ['Crit Rate']);
    await startComparing(user);

    const lines = within(strategyPanel('A')).getAllByRole('listitem');
    expect(lines.map((line) => line.textContent)).toEqual([
      'Tune Stage 1/5 (+5)at least 1 of Crit Rate92.3% discarded here',
      'Tune Stage 2/5 (+10)every Echo keeps tuningnothing discarded',
      'Tune Stage 3/5 (+15)every Echo keeps tuningnothing discarded',
      'Tune Stage 4/5 (+20)every Echo keeps tuningnothing discarded',
      'Tune Stage 5/5 (+25)every Echo keeps tuningnothing discarded',
    ]);
    expect(strategyPanel('A')).toHaveTextContent(/Success Rate 7\.7%$/);

    await user.click(within(strategyPanel('A')).getByRole('button', { name: 'Edit' }));
    expect(panelStage('A', 1)).toHaveTextContent('92.3% discarded here');
    expect(
      within(panelStage('A', 1)).getByRole('combobox', { name: 'Kind of rule' }),
    ).toBeInTheDocument();
    await user.click(within(strategyPanel('A')).getByRole('button', { name: 'Done' }));
    expect(within(strategyPanel('A')).queryByRole('region', { name: /Tune Stage/ })).toBeNull();
  });

  it('compares B with A in cost and Echo Scores, with no Success Rate row', async () => {
    const user = await openWithTable();
    await startComparing(user);
    await addCountRuleToB(user, 1, ['Crit Rate']);

    await waitFor(() => expect(comparisonRow('Echoes started')).toHaveTextContent('13.00'));
    expect(
      within(comparison())
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['Strategy A', 'Strategy B', 'B compared with A']);
    expect(
      within(comparison())
        .getAllByRole('rowheader')
        .map((header) => header.textContent),
    ).toEqual([
      'Echoes started per Successful Echo',
      'Echo EXP per Successful Echo',
      'Tuners per Successful Echo',
      'Shell Credits per Successful Echo',
      'Average Echo Score of Successful Echoes',
      'Lowest Echo Score of a Successful Echo',
    ]);
    // 13 Echoes started instead of 1 is worse; a higher Average Echo Score is better.
    expect(comparisonRow('Echoes started')).toHaveTextContent(
      'Echoes started per Successful Echo1.0013.00▼+1200.0% worse',
    );
    expect(comparisonRow('Average Echo Score')).toHaveTextContent(/▲\+[\d.]+% better$/);
    // A's lowest Successful Echo has no Crit Rate, so an Echo Score of 0: there is no relative change from 0.
    expect(comparisonRow('Lowest Echo Score')).toHaveTextContent(
      /^Lowest Echo Score of a Successful Echo0\.005\.04$/,
    );
  });

  it('shows a grey pill with no arrow for equal values, and an empty cell without Successful Echoes', async () => {
    const user = await openWithTable();
    await startComparing(user);
    await waitFor(() => expect(comparisonRow('Tuners')).toHaveTextContent(/0\.0%$/));
    expect(comparisonRow('Tuners')).not.toHaveTextContent(/[▲▼]|better|worse/);

    await addCountRuleToB(user, 1, ['Crit Rate']);
    await user.selectOptions(
      within(panelStage('B', 1)).getByRole('combobox', { name: 'How many' }),
      '2',
    );
    await waitFor(() => expect(comparisonRow('Tuners')).toHaveTextContent(/—$/));
  });

  it('draws the paired chart for screens only, with an A/B legend', async () => {
    const user = await openWithTable();
    await startComparing(user);
    const chart = within(comparison()).getByTestId('paired-chart');
    expect(chart).toHaveAttribute('aria-hidden', 'true');
    expect(chart).toHaveTextContent(/^AB/);
  });

  it('works out Top x% thresholds for examples pending in both strategies at once', async () => {
    const { calculator, release } = holdingTopScores();
    const user = open(calculator);
    await user.selectOptions(picker(), 'Crit Rate only');
    await startComparing(user);
    await user.click(within(strategyPanel('A')).getByRole('button', { name: 'Edit' }));
    await user.selectOptions(
      within(strategyPanel('A')).getByRole('combobox', { name: 'Start from an example' }),
      'Chance to reach a Top 5% Echo',
    );
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Replace' }));
    await user.selectOptions(
      within(strategyPanel('B')).getByRole('combobox', { name: 'Start from an example' }),
      'Double crit, or one great crit roll',
    );
    release();
    const field = (name: 'A' | 'B') =>
      within(panelStage(name, 5)).getByRole('textbox', { name: 'Echo Score' });
    await waitFor(() => expect(field('A')).toHaveValue('7.4'));
    await waitFor(() => expect(field('B')).toHaveValue('6.5'));
  });

  it('calculates one job per strategy, A before B', async () => {
    const calculator = inProcessCalculator();
    const asked = vi.spyOn(calculator, 'calculateUpgradeStrategy');
    const user = open(calculator);
    await user.selectOptions(picker(), 'Crit Rate only');
    await startComparing(user);
    asked.mockClear();
    await user.selectOptions(picker(), 'Atk only');
    expect(asked.mock.calls.map(([strategy]) => strategy)).toEqual(['A', 'B']);
  });
});
