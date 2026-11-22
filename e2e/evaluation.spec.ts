import { expect, test } from '@playwright/test';

test.describe('Echo Evaluation', () => {
  test('enters an Echo, picks a table and sees a Target Chance', async ({ page }) => {
    await page.goto('#evaluation');
    await expect(
      page.getByText('Pick a Substat Weight Table for your Resonator below.'),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Add the Substat revealed at +5' }).click();
    await page.getByRole('button', { name: 'Crit Rate', exact: true }).click();
    await page.getByRole('button', { name: '8.1%' }).click();
    await page.getByRole('button', { name: 'Add the Substat revealed at +10' }).click();
    await page.getByRole('button', { name: 'Crit Damage', exact: true }).click();
    await page.getByRole('button', { name: '16.2%' }).click();
    await expect(page.getByText('Tune Stage 2/5 (+10)')).toBeVisible();

    await page.getByRole('combobox', { name: 'Add a Weight Table' }).selectOption('Mornye');
    await expect(page.getByRole('heading', { name: 'Mornye' })).toBeVisible();
    const targetChance = page.getByRole('group', { name: 'Target Chance', exact: true });
    await expect(targetChance).toContainText('Set a Target Score below');

    await page.getByRole('textbox', { name: 'Target Score for Mornye', exact: true }).fill('20');
    await expect(targetChance).toContainText(/\d+\.\d\d%|<0\.01%|0%/);
    await expect(page.getByRole('group', { name: 'Top Percent', exact: true })).toContainText(
      /Top /,
    );
    await expect(
      page.getByRole('img', {
        name: /^Echo distribution for Mornye: final Echo Score from \d+\.\d to \d+\.\d, Target Score 20 at/,
      }),
    ).toBeVisible();
  });

  test('compares several tables, and nothing moves when focus, a table or a target changes', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'The phone layout comes with ticket 21.');
    await page.goto('#evaluation');
    await page.getByRole('button', { name: 'Add the Substat revealed at +5' }).click();
    await page.getByRole('button', { name: 'Crit Rate', exact: true }).click();
    await page.getByRole('button', { name: '8.1%' }).click();

    const add = page.getByRole('combobox', { name: 'Add a Weight Table' });
    await add.selectOption('Mornye');
    await add.selectOption('Jinhsi');
    await add.selectOption('Cartethyia');
    const rows = page.getByRole('table').getByRole('row');
    await expect(rows).toHaveCount(4);
    await expect(page.getByRole('heading', { name: 'Cartethyia' })).toBeVisible();
    await expect(rows.nth(3)).toHaveAttribute('aria-current', 'true');
    // Each row gets its own Echo Score.
    for (const index of [1, 2, 3]) await expect(rows.nth(index)).toContainText(/\d+\.\d\d/);

    const layout = () =>
      page.evaluate(() =>
        [
          ...document.querySelectorAll('section[aria-label="Results"] [role="group"]'),
          ...document.querySelectorAll('svg[role="img"][aria-label^="Echo distribution"]'),
          ...document.querySelectorAll(
            'table tr, table th, select[aria-label="Add a Weight Table"]',
          ),
        ].map((element) => {
          // In page coordinates: clicking a row may scroll it into view.
          const { x, y, width, height } = element.getBoundingClientRect();
          return [x + scrollX, y + scrollY, width, height].map(Math.round).join(',');
        }),
      );
    const before = await layout();

    await rows.nth(1).getByRole('cell').nth(3).click();
    await expect(page.getByRole('heading', { name: 'Mornye' })).toBeVisible();
    expect(await layout()).toEqual(before);

    await page
      .getByRole('combobox', { name: 'Swap Jinhsi for another Weight Table' })
      .selectOption('Qingxiao');
    await expect(rows.nth(2).getByRole('combobox')).toHaveValue('Qingxiao');
    expect(await layout()).toEqual(before);

    await page.getByRole('textbox', { name: 'Target Score for Mornye', exact: true }).fill('20');
    await expect(page.getByRole('group', { name: 'Target Chance', exact: true })).toContainText(
      /%/,
    );
    await page.getByRole('textbox', { name: 'Target Score for Mornye', exact: true }).fill('-');
    await expect(
      page.getByRole('textbox', { name: 'Target Score for Mornye', exact: true }),
    ).toHaveAttribute('aria-invalid', 'true');
    expect(await layout()).toEqual(before);
  });

  test('finds the same Echo, tables, focus and targets after a reload', async ({ page }) => {
    await page.goto('#evaluation');
    await page.getByRole('button', { name: 'Add the Substat revealed at +5' }).click();
    await page.getByRole('button', { name: 'Crit Rate', exact: true }).click();
    await page.getByRole('button', { name: '8.1%' }).click();
    const add = page.getByRole('combobox', { name: 'Add a Weight Table' });
    await add.selectOption('Mornye');
    await page.getByRole('textbox', { name: 'Target Score for Mornye', exact: true }).fill('20');
    await add.selectOption('Jinhsi');
    await page.getByRole('textbox', { name: 'ER Target Score for Jinhsi', exact: true }).fill('5');
    // Reload only once the last edit is remembered.
    await expect
      .poll(() =>
        page.evaluate(() => {
          const raw = localStorage.getItem('echo-helper.echo-evaluation');
          const data = raw
            ? (
                JSON.parse(raw) as {
                  data?: { targets?: Record<string, { erTargetText?: string }> };
                }
              ).data
            : undefined;
          return data?.targets?.Jinhsi?.erTargetText;
        }),
      )
      .toBe('5');

    await page.reload();

    await expect(page.getByText('Tune Stage 1/5 (+5)')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Tune slots' })).toContainText('8.1%');
    await expect(page.getByRole('heading', { name: 'Jinhsi' })).toBeVisible();
    await expect(
      page.getByRole('combobox', { name: /^Swap .* for another Weight Table$/ }),
    ).toHaveCount(2);
    await expect(
      page.getByRole('textbox', { name: 'Target Score for Mornye', exact: true }),
    ).toHaveValue('20');
    await expect(
      page.getByRole('textbox', { name: 'ER Target Score for Jinhsi', exact: true }),
    ).toHaveValue('5');
  });

  test('keeps each result box one size whatever it shows, at every width', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'The phone layout comes with ticket 21.');
    await page.goto('#evaluation');
    const addSubstat = async (type: string) => {
      await page.getByRole('button', { name: /^Add the Substat revealed at/ }).click();
      await page.getByRole('button', { name: type, exact: true }).click();
      // Focus is on the first value.
      await page.keyboard.press('Enter');
    };
    await addSubstat('Crit Rate');
    await page.getByRole('combobox', { name: 'Add a Weight Table' }).selectOption('Mornye');
    const boxes = page.getByRole('region', { name: 'Results' }).getByRole('group');
    await expect(boxes.first()).toContainText('Set a Target Score below');

    /**
     * At each width: each box's height, marked if anything in it reaches past its edges, and for each row the
     * smallest space left under a box's content.
     */
    const WIDTHS = [1280, 1000, 830];
    async function measure() {
      const sizes: string[] = [];
      const spaceLeft: number[] = [];
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        const measured = await boxes.evaluateAll((groups) =>
          groups.map((group) => {
            const box = group.getBoundingClientRect();
            const inner = [...group.querySelectorAll('*')].map((child) =>
              child.getBoundingClientRect(),
            );
            const overflows = inner.some(
              (rect) => rect.bottom > box.bottom + 0.5 || rect.right > box.right + 0.5,
            );
            const contentBottom = Math.max(...inner.map((rect) => rect.bottom));
            return {
              top: box.top,
              height: box.height,
              overflows,
              left: box.bottom - contentBottom,
            };
          }),
        );
        sizes.push(
          ...measured.map(
            ({ height, overflows }) => `${Math.round(height)}${overflows ? ' overflows' : ''}`,
          ),
        );
        const rows = [...new Set(measured.map(({ top }) => Math.round(top)))];
        spaceLeft.push(
          ...rows.map((top) =>
            Math.min(
              ...measured.filter((box) => Math.round(box.top) === top).map(({ left }) => left),
            ),
          ),
        );
      }
      return { sizes, spaceLeft };
    }

    // Reasons in all three boxes that can give one.
    const first = await measure();
    expect(first.sizes.filter((size) => size.endsWith('overflows'))).toEqual([]);

    // Numbers instead.
    await page.getByRole('textbox', { name: 'Target Score for Mornye', exact: true }).fill('20');
    await page.getByRole('textbox', { name: 'ER Target Score for Mornye', exact: true }).fill('5');
    await addSubstat('Energy Regen');
    await expect(boxes.nth(1)).toContainText('%');
    await expect(boxes.nth(4)).toContainText('Top');
    const numbers = await measure();
    expect(numbers.sizes).toEqual(first.sizes);

    // 5/5: verdicts, under the other labels.
    await addSubstat('Crit Damage');
    await addSubstat('ATK%');
    await addSubstat('Flat ATK');
    await expect(boxes.first()).toContainText(/Reached|Not reached/);
    const verdicts = await measure();
    expect(verdicts.sizes).toEqual(first.sizes);

    // No taller than needed: in each row, some content the boxes can show fills a box to its bottom edge.
    const tightest = first.spaceLeft.map((left, i) =>
      Math.min(left, numbers.spaceLeft[i] ?? Infinity, verdicts.spaceLeft[i] ?? Infinity),
    );
    expect(tightest.filter((left) => left > 1)).toEqual([]);
  });
});
