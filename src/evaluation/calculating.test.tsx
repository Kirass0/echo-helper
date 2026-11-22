// Echo Evaluation while results are pending, and when they can't be calculated (spec §11).
import { render, screen, within } from '@testing-library/react';
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

const CALCULATING = 'Calculating…';
const FAILED = "Couldn't calculate this. Reload the page to try again.";

type User = ReturnType<typeof userEvent.setup>;

function open(calculator: Calculator) {
  const user = userEvent.setup();
  render(<EchoEvaluationTab calculator={calculator} builtInTables={TABLES} />);
  return user;
}

/** A calculator whose Echo Evaluation requests wait until released. */
function holdingEvaluation() {
  const inner = inProcessCalculator();
  const held: (() => void)[] = [];
  const calculator: Calculator = {
    ...inner,
    evaluate: (...args) => held.push(() => inner.evaluate(...args)),
  };
  return {
    calculator,
    release: () => {
      for (const send of held.splice(0)) send();
    },
  };
}

async function chooseTable(user: User, name: string) {
  await user.selectOptions(screen.getByRole('combobox', { name: 'Add a Weight Table' }), name);
}

const results = () => screen.getByRole('region', { name: 'Results' });
const chart = () => screen.getByRole('region', { name: 'Echo distribution' });
const row = (name: string) =>
  screen
    .getByRole('textbox', { name: `Target Score for ${name}` })
    .closest('tr') as HTMLTableRowElement;
const box = (label: string) => screen.getByRole('group', { name: label });

describe('a pending result', () => {
  it('changes nothing for about 300 ms, then shows "Calculating…" in each slot kept for it', async () => {
    const { calculator, release } = holdingEvaluation();
    const user = open(calculator);
    await chooseTable(user, 'Crit Rate only');
    release();
    await within(box('Echo Score')).findByText('0.00');

    await user.type(screen.getByRole('textbox', { name: 'Target Score for Crit Rate only' }), '6');
    expect(screen.queryByText(CALCULATING)).toBeNull();
    // The last result stays while it is pending.
    expect(box('Echo Score')).toHaveTextContent('0.00');

    expect(await within(row('Crit Rate only')).findByText(CALCULATING)).toBeInTheDocument();
    expect(within(results()).getByText(CALCULATING)).toBeInTheDocument();
    expect(within(chart()).getByText(CALCULATING)).toBeInTheDocument();
    expect(box('Echo Score')).toHaveTextContent('0.00');

    release();
    await within(box('Target Chance')).findByText('20.51%');
    expect(screen.queryByText(CALCULATING)).toBeNull();
  });

  it('shows "Calculating…" only for the tables still pending', async () => {
    // Atk only's results are held back; the other table's come at once.
    const inner = inProcessCalculator();
    const calculator: Calculator = {
      ...inner,
      evaluate: (input, onResult, onFailed) =>
        inner.evaluate(
          input,
          (result) => {
            if (result.tableName !== 'Atk only') onResult(result);
          },
          onFailed,
        ),
    };
    const user = open(calculator);
    await chooseTable(user, 'Crit Rate only');
    await chooseTable(user, 'Atk only');

    expect(await within(row('Atk only')).findByText(CALCULATING)).toBeInTheDocument();
    expect(within(row('Crit Rate only')).queryByText(CALCULATING)).toBeNull();
    expect(within(row('Crit Rate only')).getAllByRole('cell')[3]).toHaveTextContent('0.00');
  });
});

/** Jobs in which the Echo Evaluation of one table always throws, as running out of memory would. */
const failingFor = (failing: string) => () => {
  const jobs = createEchoEvaluationJobs();
  return {
    echoEvaluation: {
      keepOnly: jobs.keepOnly,
      run: (input: Parameters<typeof jobs.run>[0]) => {
        if (input.table.name === failing) throw new RangeError('Out of memory');
        return jobs.run(input);
      },
    },
  };
};

describe('a result that can’t be calculated', () => {
  it('says so where it would show, once the restarted worker fails too; the rest keeps working', async () => {
    const user = open(inProcessCalculator(failingFor('Atk only')));
    await chooseTable(user, 'Crit Rate only');
    await chooseTable(user, 'Atk only');

    expect(await within(row('Atk only')).findByText(FAILED)).toBeInTheDocument();
    expect(within(results()).getByText(FAILED)).toBeInTheDocument();
    expect(within(chart()).getByText(FAILED)).toBeInTheDocument();
    expect(within(row('Crit Rate only')).queryByText(FAILED)).toBeNull();

    // The other table goes on calculating.
    await user.type(screen.getByRole('textbox', { name: 'Target Score for Crit Rate only' }), '6');
    await user.click(within(row('Crit Rate only')).getAllByRole('cell')[3] as HTMLElement);
    await within(box('Target Chance')).findByText('20.51%');
    expect(within(results()).queryByText(FAILED)).toBeNull();
  });
});
