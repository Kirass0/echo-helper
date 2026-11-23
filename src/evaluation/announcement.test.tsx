// What Echo Evaluation's live region says (spec §15, "Live region").
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createEchoEvaluationJobs } from '../calculation/echoEvaluationJob';
import type { Calculator } from '../calculation/newestInputWins';
import type { WeightTableData } from '../catalogue/catalogue';
import { EchoEvaluationTab } from '../test/EchoEvaluationTab';
import { inProcessCalculator } from '../test/inProcessCalculator';

const TABLES: readonly WeightTableData[] = [
  { name: 'Crit Rate only', weights: { Critical_Rate: 6 } },
  { name: 'Atk only', weights: { Atk_Percent: 1 } },
];

type User = ReturnType<typeof userEvent.setup>;

function open(calculator: Calculator = inProcessCalculator()) {
  const user = userEvent.setup();
  render(<EchoEvaluationTab calculator={calculator} builtInTables={TABLES} />);
  return user;
}

const region = () => screen.getByRole('status');
const box = (label: string) => screen.getByRole('group', { name: label });
/** The line spoken once results settle: about 1 s after, so a little more than the usual wait. */
const spoken = (text: string) =>
  waitFor(() => expect(region()).toHaveTextContent(text), { timeout: 3000 });

async function chooseTable(user: User, name: string) {
  await user.selectOptions(screen.getByRole('combobox', { name: 'Add a Weight Table' }), name);
}

async function addSubstat(user: User, type: string, value: string) {
  await user.click(screen.getByRole('button', { name: /^Add the Substat revealed at/ }));
  await user.click(screen.getByRole('button', { name: type }));
  await user.click(screen.getByRole('button', { name: value }));
}

const typeTarget = (user: User, name: string, text: string) =>
  user.type(screen.getByRole('textbox', { name: `Target Score for ${name}` }), text);

describe("Echo Evaluation's live region", () => {
  it('is the only one, and says nothing before there are results', () => {
    open();
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(region()).toBeEmptyDOMElement();
  });

  it("speaks the focused table's Echo Score when it has no Target Score, once the results settle", async () => {
    const user = open();
    await chooseTable(user, 'Crit Rate only');
    await within(box('Echo Score')).findByText('0.00');
    expect(region()).toBeEmptyDOMElement();
    await spoken('Echo Score: 0.00');
  });

  it("speaks the focused table's Target Chance once it has a Target Score", async () => {
    const user = open();
    await chooseTable(user, 'Crit Rate only');
    await typeTarget(user, 'Crit Rate only', '6');
    await within(box('Target Chance')).findByText('20.51%');
    await spoken('Target Chance: 20.51%');
  });

  it('speaks Reached or Not reached at 5/5', async () => {
    const user = open();
    await chooseTable(user, 'Crit Rate only');
    await typeTarget(user, 'Crit Rate only', '7');
    await addSubstat(user, 'Crit Rate', '7.5%');
    await addSubstat(user, 'HP%', '8.6%');
    await addSubstat(user, 'Flat DEF', '50');
    await addSubstat(user, 'Flat HP', '430');
    await addSubstat(user, 'Crit Damage', '15%');
    await spoken('Target Score: Not reached');

    await user.clear(screen.getByRole('textbox', { name: 'Target Score for Crit Rate only' }));
    await typeTarget(user, 'Crit Rate only', '6');
    await spoken('Target Score: Reached');
  });

  it('speaks the calculation failure as soon as it shows, never "Calculating…"', async () => {
    const user = open(failingFor('Atk only'));
    await chooseTable(user, 'Atk only');
    const failed = "Couldn't calculate this. Reload the page to try again.";
    await within(screen.getByRole('region', { name: 'Results' })).findByText(failed);
    expect(region()).toHaveTextContent(failed);
    expect(region()).not.toHaveTextContent('Calculating…');
  });

  it("speaks a listed table's calculation failure, naming it, while another table is focused", async () => {
    const user = open(failingFor('Atk only'));
    await chooseTable(user, 'Atk only');
    await chooseTable(user, 'Crit Rate only');
    await waitFor(() =>
      expect(region()).toHaveTextContent(
        "Atk only: Couldn't calculate this. Reload the page to try again.",
      ),
    );
    expect(region()).not.toHaveTextContent('Calculating…');
  });
});

/** A calculator whose Echo Evaluation of one table is always given up. */
function failingFor(tableName: string): Calculator {
  return inProcessCalculator(() => {
    const jobs = createEchoEvaluationJobs();
    return {
      echoEvaluation: {
        keepOnly: jobs.keepOnly,
        run: (input: Parameters<typeof jobs.run>[0]) => {
          if (input.table.name === tableName) throw new RangeError('Out of memory');
          return jobs.run(input);
        },
      },
    };
  });
}
