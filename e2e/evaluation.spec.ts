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
          ...document.querySelectorAll(
            'table tr, table th, select[aria-label="Add a Weight Table"]',
          ),
        ].map((element) => {
          const { x, y, width, height } = element.getBoundingClientRect();
          return [x, y, width, height].map(Math.round).join(',');
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
});
