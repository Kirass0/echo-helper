import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../app/App';
import type { WeightTableData } from '../catalogue/catalogue';
import { ECHO_EVALUATION_KEY } from '../evaluation/echoEvaluationEntry';
import { inProcessCalculator } from '../test/inProcessCalculator';
import { CUSTOM_TABLES_KEY } from './customTablesEntry';

const TABLES: readonly WeightTableData[] = [
  { name: 'Crit Rate only', weights: { Critical_Rate: 6 } },
  { name: 'Atk only', weights: { Atk_Percent: 1 } },
];

/** Opens the app, as on page load. */
function open(builtInTables = TABLES) {
  const user = userEvent.setup();
  const view = render(
    <App
      buildDate="2026-11-20T09:30:00.000Z"
      calculator={inProcessCalculator()}
      builtInTables={builtInTables}
    />,
  );
  return { user, ...view };
}

afterEach(() => {
  window.location.hash = '';
});

const stored = (data: unknown) => JSON.stringify({ version: 1, data });
const savedTables = () =>
  (JSON.parse(localStorage.getItem(CUSTOM_TABLES_KEY) ?? 'null') as { data: unknown } | null)?.data;
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const dialog = () => within(screen.getByRole('dialog'));
const addPicker = () => screen.getByRole('combobox', { name: 'Add a Weight Table' });
const rowNames = () =>
  screen
    .queryAllByRole('combobox', { name: /^Swap .* for another Weight Table$/ })
    .map((picker) =>
      picker.getAttribute('aria-label')?.replace(/^Swap (.*) for another Weight Table$/, '$1'),
    );
const customGroup = () =>
  within(addPicker())
    .queryAllByRole('group')
    .find((group) => group.getAttribute('label') === 'Custom');
const customOptions = () =>
  customGroup()
    ? within(customGroup() as HTMLElement)
        .getAllByRole('option')
        .map((option) => option.textContent)
    : [];
const notices = () =>
  within(screen.getByRole('region', { name: 'Notices' }))
    .queryAllByRole('listitem')
    .map((notice) => notice.textContent);

async function makeTable(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.selectOptions(addPicker(), 'New Custom Weight Table…');
  await user.clear(dialog().getByRole('textbox', { name: 'Name' }));
  await user.type(dialog().getByRole('textbox', { name: 'Name' }), name);
  await user.type(dialog().getByRole('textbox', { name: 'Crit Rate' }), '3');
  await user.click(dialog().getByRole('button', { name: 'Save' }));
  await user.keyboard('{Escape}');
}

describe('remembering Custom Weight Tables', () => {
  it('keeps saved tables across a reload', async () => {
    const first = open();
    await makeTable(first.user, 'Mine');
    first.unmount();

    open();
    // The row stays only while its table exists.
    expect(rowNames()).toEqual(['Mine']);
  });

  it('writes the tables when one is renamed or deleted, never a draft', async () => {
    const { user } = open();
    await makeTable(user, 'Mine');
    await user.click(button('Weights of Mine'));
    await user.click(dialog().getByRole('button', { name: 'Edit' }));
    await user.clear(dialog().getByRole('textbox', { name: 'Name' }));
    await user.type(dialog().getByRole('textbox', { name: 'Name' }), 'Renamed');
    expect(savedTables()).toEqual([{ name: 'Mine', weights: expect.objectContaining({}) }]);
    await user.click(dialog().getByRole('button', { name: 'Save' }));
    expect((savedTables() as { name: string }[]).map((saved) => saved.name)).toEqual(['Renamed']);

    await user.click(dialog().getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(savedTables()).toEqual([]);
  });

  it('loses a table deleted in another tab silently, as a vanished table', async () => {
    const { user } = open();
    await makeTable(user, 'Mine');
    await user.selectOptions(addPicker(), 'Atk only');
    expect(rowNames()).toEqual(['Mine', 'Atk only']);

    const newValue = stored([]);
    act(() => {
      localStorage.setItem(CUSTOM_TABLES_KEY, newValue);
      window.dispatchEvent(new StorageEvent('storage', { key: CUSTOM_TABLES_KEY, newValue }));
    });
    expect(rowNames()).toEqual(['Atk only']);
    expect(customOptions()).toEqual([]);
    expect(screen.queryByRole('region', { name: 'Notices' })).not.toBeInTheDocument();
  });

  it.each([
    ['viewing it', () => Promise.resolve()],
    [
      'asking to delete it',
      (user: ReturnType<typeof userEvent.setup>) =>
        user.click(dialog().getByRole('button', { name: 'Delete' })),
    ],
    [
      'editing it',
      async (user: ReturnType<typeof userEvent.setup>) => {
        await user.click(dialog().getByRole('button', { name: 'Edit' }));
        await user.type(dialog().getByRole('textbox', { name: 'Crit Rate' }), '9');
      },
    ],
  ])(
    'closes the dialog silently when its table is deleted in another tab while %s',
    async (_, step) => {
      const { user } = open();
      await makeTable(user, 'Mine');
      await user.selectOptions(addPicker(), 'Atk only');
      await user.click(button('Weights of Mine'));
      await step(user);

      const newValue = stored([]);
      act(() => {
        localStorage.setItem(CUSTOM_TABLES_KEY, newValue);
        window.dispatchEvent(new StorageEvent('storage', { key: CUSTOM_TABLES_KEY, newValue }));
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(savedTables()).toEqual([]);
      expect(button('Weights of Atk only')).toHaveFocus();

      // The dialog opens again on the next press.
      await user.click(button('Weights of Atk only'));
      expect(dialog().getByRole('heading')).toHaveTextContent('Atk only');
      await user.keyboard('{Escape}');
      await user.selectOptions(addPicker(), 'New Custom Weight Table…');
      expect(dialog().getByRole('heading')).toHaveTextContent('New Custom Weight Table');
    },
  );

  describe('a name taken by a new built-in', () => {
    const custom = { name: 'Atk only', weights: { Critical_Rate: 3 } };

    function storeBeforeTheDeploy() {
      localStorage.setItem(CUSTOM_TABLES_KEY, stored([custom]));
      localStorage.setItem(
        ECHO_EVALUATION_KEY,
        stored({
          substats: [],
          listed: ['Atk only'],
          focused: 'Atk only',
          targets: { 'Atk only': { targetText: '12', erTargetText: '' } },
        }),
      );
    }

    it('goes to the built-in; the Custom table and what was remembered become "X (custom)"', () => {
      storeBeforeTheDeploy();
      open(TABLES);
      expect(rowNames()).toEqual(['Atk only (custom)']);
      expect(
        screen.getByRole('textbox', { name: 'Target Score for Atk only (custom)' }),
      ).toHaveValue('12');
      expect(customOptions()).toEqual([]);
      expect(notices()).toEqual([
        "A new built-in Substat Weight Table is called 'Atk only', so your Custom table was renamed to 'Atk only (custom)'.",
      ]);
    });

    it('is repaired and told the same way under StrictMode', () => {
      storeBeforeTheDeploy();
      const first = render(
        <StrictMode>
          <App
            buildDate="2026-11-20T09:30:00.000Z"
            calculator={inProcessCalculator()}
            builtInTables={TABLES}
          />
        </StrictMode>,
      );
      expect(rowNames()).toEqual(['Atk only (custom)']);
      expect(notices()).toHaveLength(1);
      expect((savedTables() as { name: string }[]).map((saved) => saved.name)).toEqual([
        'Atk only (custom)',
      ]);
      first.unmount();

      open(TABLES);
      expect(screen.queryByRole('region', { name: 'Notices' })).not.toBeInTheDocument();
      expect(rowNames()).toEqual(['Atk only (custom)']);
    });

    it('is told once, and never again even if not closed', () => {
      storeBeforeTheDeploy();
      open(TABLES).unmount();
      open(TABLES);
      expect(screen.queryByRole('region', { name: 'Notices' })).not.toBeInTheDocument();
      expect(rowNames()).toEqual(['Atk only (custom)']);
    });
  });

  describe('tables that could not be read', () => {
    it('are removed with one notice, closed with ×', async () => {
      localStorage.setItem(
        CUSTOM_TABLES_KEY,
        stored([
          { name: '', weights: {} },
          { name: 'Fine', weights: { Critical_Rate: 1 } },
        ]),
      );
      const { user } = open();
      expect(notices()).toEqual(["1 Custom Weight Table couldn't be read and was removed."]);
      expect(customOptions()).toEqual(['Fine']);

      await user.click(button('Close notice'));
      expect(screen.queryByRole('region', { name: 'Notices' })).not.toBeInTheDocument();
    });

    it('are counted in the notice', () => {
      localStorage.setItem(
        CUSTOM_TABLES_KEY,
        stored([{ name: 'Bad', weights: { Critical_Rate: -1 } }, { name: '' }, 'junk']),
      );
      open();
      expect(notices()).toEqual(["3 Custom Weight Tables couldn't be read and were removed."]);
    });

    it('are told of once', () => {
      localStorage.setItem(CUSTOM_TABLES_KEY, stored([{ name: '' }]));
      open().unmount();
      open();
      expect(screen.queryByRole('region', { name: 'Notices' })).not.toBeInTheDocument();
    });
  });
});
