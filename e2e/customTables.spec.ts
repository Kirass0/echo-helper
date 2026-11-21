import { expect, test } from '@playwright/test';

test.describe('Custom Weight Tables', () => {
  test('duplicates a built-in, edits a weight and sees the row update', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'The phone layout comes with ticket 21.');
    await page.goto('#evaluation');
    await page.getByRole('button', { name: 'Add the Substat revealed at +5' }).click();
    await page.getByRole('button', { name: 'Crit Rate', exact: true }).click();
    await page.getByRole('button', { name: '8.1%' }).click();
    await page.getByRole('combobox', { name: 'Add a Weight Table' }).selectOption('Mornye');

    await page.getByRole('button', { name: 'Weights of Mornye' }).click();
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByText("Built-in tables can't be changed. Duplicate it to make your own."),
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Duplicate' }).click();
    await expect(dialog.getByRole('textbox', { name: 'Name' })).toBeFocused();
    await expect(dialog.getByRole('textbox', { name: 'Name' })).toHaveValue('Mornye (copy)');
    await dialog.getByRole('textbox', { name: 'Crit Rate', exact: true }).fill('10');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    const rows = page.getByRole('table').getByRole('row');
    await expect(rows).toHaveCount(3);
    const copy = rows.nth(2);
    await expect(copy).toHaveAttribute('aria-current', 'true');
    await expect(copy.getByText('Custom', { exact: true })).toBeVisible();
    // 8.1% Crit Rate is 8.1 / 7.5 Reference Rolls, at a weight of 10.
    await expect(copy.getByRole('cell').nth(3)).toHaveText('10.80');

    await page.getByRole('button', { name: 'Weights of Mornye (copy)' }).click();
    await dialog.getByRole('button', { name: 'Edit' }).click();
    await dialog.getByRole('textbox', { name: 'Crit Rate', exact: true }).fill('5');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(copy.getByRole('cell').nth(3)).toHaveText('5.40');
    // Reload only once the edit is remembered.
    await expect
      .poll(() =>
        page.evaluate(() => {
          const raw = localStorage.getItem('echo-helper.custom-tables');
          const tables = raw
            ? (JSON.parse(raw) as { data?: { name: string; weights: Record<string, number> }[] })
                .data
            : undefined;
          return tables?.find((table) => table.name === 'Mornye (copy)')?.weights.Critical_Rate;
        }),
      )
      .toBe(5);

    await page.reload();
    await expect(page.getByRole('button', { name: 'Weights of Mornye (copy)' })).toBeVisible();
    await expect(rows.nth(2).getByRole('cell').nth(3)).toHaveText('5.40');
  });
});
