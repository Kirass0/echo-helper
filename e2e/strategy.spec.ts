import { expect, test } from '@playwright/test';

test.describe('Upgrade Strategy', () => {
  test('builds a one-rule strategy and sees its Success Rate', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'The phone layout comes with ticket 22.');
    await page.goto('#strategy');
    await expect(
      page.getByText('Pick a Substat Weight Table above to build an Upgrade Strategy.'),
    ).toBeVisible();
    await page.getByRole('combobox', { name: 'Substat Weight Table' }).selectOption('Mornye');
    // The first visit's "Crit first" makes way for an empty strategy.
    await page
      .getByRole('combobox', { name: 'Start from an example' })
      .selectOption('Keep every Echo');
    await page.getByRole('dialog').getByRole('button', { name: 'Replace' }).click();

    const firstStage = page.getByRole('region', { name: 'Tune Stage 1/5 (+5)' });
    await firstStage.getByRole('button', { name: '+ add a rule' }).click();
    await expect(firstStage.getByRole('combobox', { name: 'Kind of rule' })).toBeFocused();
    await firstStage.getByRole('button', { name: 'pick Substats' }).click();
    await page.getByRole('group', { name: 'Substats' }).getByLabel('Crit Rate').check();
    await page.keyboard.press('Escape');

    // The first Substat is Crit Rate 1 time in 13, whatever the table.
    const results = page.getByRole('region', { name: 'Results' });
    await expect(results.getByText('7.7%', { exact: true })).toBeVisible();
    await expect(firstStage).toContainText('92.3% discarded here');
    await expect(results.getByRole('row', { name: /^Echoes started/ })).toContainText('13.00');
  });

  test('loads an example with its Top x% thresholds worked out', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'The phone layout comes with ticket 22.');
    await page.goto('#strategy');
    await page.getByRole('combobox', { name: 'Substat Weight Table' }).selectOption('Mornye');
    await page
      .getByRole('combobox', { name: 'Start from an example' })
      .selectOption('Chance to reach a Top 5% Echo');
    await page.getByRole('dialog').getByRole('button', { name: 'Replace' }).click();

    const lastStage = page.getByRole('region', { name: 'Tune Stage 5/5 (+25)' });
    await expect(lastStage.getByRole('textbox', { name: 'Echo Score' })).toHaveValue(
      /^\d+(\.\d)?$/,
    );
    const results = page.getByRole('region', { name: 'Results' });
    await expect(results.getByText(/^\d+\.\d%$/).first()).toBeVisible();
  });
});
