// Upgrade Strategy while results are pending, and when they can't be calculated (spec §11).
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../app/App';
import type { Calculator } from '../calculation/newestInputWins';
import type { StrategyName } from '../calculation/protocol';
import { createUpgradeStrategyJobs } from '../calculation/upgradeStrategyJob';
import type { WeightTableData } from '../catalogue/catalogue';
import { inProcessCalculator } from '../test/inProcessCalculator';
import { atPhoneWidth } from '../test/phoneWidth';

const TABLES: readonly WeightTableData[] = [
  { name: 'Crit Rate only', weights: { Critical_Rate: 6 } },
  { name: 'Atk only', weights: { Atk_Percent: 1 } },
];

const CALCULATING = 'Calculating…';
const FAILED = "Couldn't calculate this. Reload the page to try again.";

function open(calculator: Calculator) {
  window.location.hash = '#strategy';
  const user = userEvent.setup();
  render(
    <App buildDate="2026-11-20T09:30:00.000Z" calculator={calculator} builtInTables={TABLES} />,
  );
  return user;
}

afterEach(() => {
  window.location.hash = '';
});

/** A calculator whose Upgrade Strategy requests for these strategies wait until released. */
function holdingStrategies(...held: StrategyName[]) {
  const inner = inProcessCalculator();
  const waiting: (() => void)[] = [];
  const calculator: Calculator = {
    ...inner,
    calculateUpgradeStrategy: (strategy, ...rest) => {
      if (held.includes(strategy))
        waiting.push(() => inner.calculateUpgradeStrategy(strategy, ...rest));
      else inner.calculateUpgradeStrategy(strategy, ...rest);
    },
  };
  return {
    calculator,
    release: () => {
      for (const send of waiting.splice(0)) act(send);
    },
  };
}

const picker = () => screen.getByRole('combobox', { name: 'Substat Weight Table' });
const results = () => screen.getByRole('region', { name: 'Results' });
const strategyPanel = (name: StrategyName) =>
  screen.getByRole('region', { name: `Strategy ${name}` });

describe('a pending strategy', () => {
  it('changes nothing for about 300 ms, then shows "Calculating…" with its results', async () => {
    const { calculator, release } = holdingStrategies('A');
    const user = open(calculator);
    await user.selectOptions(picker(), 'Crit Rate only');
    expect(screen.queryByText(CALCULATING)).toBeNull();

    expect(await within(results()).findByText(CALCULATING)).toBeInTheDocument();
    release();
    expect(await within(results()).findByText(/%$/)).toBeInTheDocument();
    expect(screen.queryByText(CALCULATING)).toBeNull();
  });

  it('shows "Calculating…" for each strategy on its own while comparing', async () => {
    const { calculator } = holdingStrategies('B');
    const user = open(calculator);
    await user.selectOptions(picker(), 'Crit Rate only');
    await within(results()).findByText(/%$/);
    await user.click(screen.getByRole('button', { name: 'Compare with another strategy' }));

    expect(await within(strategyPanel('B')).findByText(CALCULATING)).toBeInTheDocument();
    expect(within(strategyPanel('A')).queryByText(CALCULATING)).toBeNull();
  });
});

const outOfMemory = () => {
  throw new RangeError('Out of memory');
};

describe('a strategy that can’t be calculated', () => {
  it('says so in the results panel', async () => {
    const user = open(inProcessCalculator(() => ({ upgradeStrategy: { run: outOfMemory } })));
    await user.selectOptions(picker(), 'Crit Rate only');
    expect(await within(results()).findByText(FAILED)).toBeInTheDocument();
  });

  it('says so when an example’s Top x% thresholds can’t be worked out, leaving them empty', async () => {
    const user = open(inProcessCalculator(() => ({ topEchoScores: { run: outOfMemory } })));
    await user.selectOptions(picker(), 'Crit Rate only');
    await within(results()).findByText(/%$/);
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Start from an example' }),
      'Double crit, or one great crit roll',
    );
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Replace' }));

    expect(await within(results()).findByText(FAILED)).toBeInTheDocument();
    const stage5 = screen.getByRole('region', { name: 'Tune Stage 5/5 (+25)' });
    expect(within(stage5).queryByText(CALCULATING)).toBeNull();
    expect(within(stage5).getByRole('textbox', { name: 'Echo Score' })).toHaveValue('');
  });

  it('says so in its results once the restarted worker fails too, while the other strategy works', async () => {
    // An empty strategy, as Strategy B starts, always throws, as running out of memory would.
    const calculator = inProcessCalculator(() => {
      const jobs = createUpgradeStrategyJobs();
      return {
        upgradeStrategy: {
          run: (input) => {
            if (input.strategy.ruleGroups.length === 0) throw new RangeError('Out of memory');
            return jobs.run(input);
          },
        },
      };
    });
    const user = open(calculator);
    await user.selectOptions(picker(), 'Crit Rate only');
    await within(results()).findByText(/%$/);
    await user.click(screen.getByRole('button', { name: 'Compare with another strategy' }));

    expect(await within(strategyPanel('B')).findByText(FAILED)).toBeInTheDocument();
    expect(within(strategyPanel('A')).queryByText(FAILED)).toBeNull();
    expect(strategyPanel('A')).toHaveTextContent(/Success Rate \d+\.\d%/);
  });
});

describe('a pending strategy on a phone', () => {
  atPhoneWidth();

  it('shows "Calculating…" in the sticky bar too', async () => {
    const { calculator, release } = holdingStrategies('A');
    const user = open(calculator);
    await user.selectOptions(picker(), 'Crit Rate only');
    release();
    const bar = await screen.findByRole('complementary', { name: 'Results summary' });
    expect(within(bar).queryByText(CALCULATING)).toBeNull();

    await user.selectOptions(picker(), 'Atk only');
    expect(await within(bar).findByText(CALCULATING)).toBeInTheDocument();
    release();
    await waitFor(() => expect(within(bar).queryByText(CALCULATING)).toBeNull());
  });
});
