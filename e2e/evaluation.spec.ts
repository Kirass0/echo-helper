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
});
