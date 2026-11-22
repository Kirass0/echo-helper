import { expect, test } from '@playwright/test';

test.describe('Upgrade Strategy', () => {
  test('builds a one-rule strategy and sees its Success Rate', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'The phone layout comes with ticket 22.');
    await page.goto('#strategy');
    await expect(
      page.getByText('Pick a Substat Weight Table above to build an Upgrade Strategy.'),
    ).toBeVisible();
    await page.getByRole('combobox', { name: 'Substat Weight Table' }).selectOption('Mornye');

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
});
