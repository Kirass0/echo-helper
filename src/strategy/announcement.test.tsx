// What Upgrade Strategy's live region says (spec §15, "Live region").
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../app/App';
import type { Calculator } from '../calculation/newestInputWins';
import type { WeightTableData } from '../catalogue/catalogue';
import { inProcessCalculator } from '../test/inProcessCalculator';
import { atPhoneWidth } from '../test/phoneWidth';

const TABLES: readonly WeightTableData[] = [
  { name: 'Crit Rate only', weights: { Critical_Rate: 6 } },
  { name: 'Atk only', weights: { Atk_Percent: 1 } },
];

const FAILED = "Couldn't calculate this. Reload the page to try again.";

function open(calculator: Calculator = inProcessCalculator()) {
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

const picker = () => screen.getByRole('combobox', { name: 'Substat Weight Table' });
const results = () => screen.getByRole('region', { name: 'Results' });
const stage = (n: number) => screen.getByRole('region', { name: `Tune Stage ${n}/5 (+${n * 5})` });
/** The visible tab's live region; the hidden tab's isn't spoken. */
const region = () => screen.getByRole('status');
/** The line spoken once results settle: about 1 s after, so a little more than the usual wait. */
const spoken = (text: string | RegExp) =>
  waitFor(() => expect(region()).toHaveTextContent(text), { timeout: 3000 });

describe("Upgrade Strategy's live region", () => {
  it('speaks the Success Rate once the results settle', async () => {
    const user = open();
    await user.selectOptions(picker(), 'Crit Rate only');
    const rate = (await within(results()).findByText(/%$/)).textContent;
    expect(region()).toBeEmptyDOMElement();
    await spoken(`Success Rate: ${rate}`);
  });

  it("speaks A's and B's Success Rates while comparing", async () => {
    const user = open();
    await user.selectOptions(picker(), 'Crit Rate only');
    const rate = (await within(results()).findByText(/%$/)).textContent;
    await user.click(screen.getByRole('button', { name: 'Compare with another strategy' }));
    // B starts empty, so every Echo passes it.
    await spoken(`Success Rate: A ${rate}, B 100.0%`);
  });

  it('speaks the unfinished-rule message as soon as it shows', async () => {
    const user = open();
    await user.selectOptions(picker(), 'Crit Rate only');
    await within(results()).findByText(/%$/);
    await user.click(within(stage(3)).getByRole('button', { name: '+ add a rule' }));
    expect(region()).toHaveTextContent(
      'Results are from before your last change. Finish the highlighted rule at Tune Stage 3/5 (+15) to update them.',
    );
  });

  it('speaks the calculation failure as soon as it shows, never "Calculating…"', async () => {
    const user = open(
      inProcessCalculator(() => ({
        upgradeStrategy: {
          run: () => {
            throw new RangeError('Out of memory');
          },
        },
      })),
    );
    await user.selectOptions(picker(), 'Crit Rate only');
    await within(results()).findByText(FAILED);
    expect(region()).toHaveTextContent(FAILED);
    expect(region()).not.toHaveTextContent('Calculating…');
  });
});

describe("Upgrade Strategy's live region on a phone", () => {
  atPhoneWidth();

  it('is the only one: the sticky bar repeats the Success Rate unspoken', async () => {
    const user = open();
    await user.selectOptions(picker(), 'Crit Rate only');
    const bar = await screen.findByRole('complementary', { name: 'Results summary' });
    const rate = (await within(results()).findByText(/%$/)).textContent;
    await spoken(`Success Rate: ${rate}`);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(bar.closest('[aria-live]')).toBeNull();
    expect(bar.querySelector('[aria-live]')).toBeNull();
  });
});
