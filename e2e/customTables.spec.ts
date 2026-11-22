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
    // Opening puts focus on the first real control.
    await expect(dialog.getByRole('button', { name: 'Duplicate' })).toBeFocused();
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

test.describe('Substat Weight Tables list', () => {
  test('shows a long Custom table name in full beside its tag at full desktop width', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'Full desktop width only.');
    await page.setViewportSize({ width: 1280, height: 800 });
    const name = 'Changli (my rotation)';
    await page.goto('#evaluation');
    await page.getByRole('combobox', { name: 'Add a Weight Table' }).selectOption({
      label: 'New Custom Weight Table…',
    });
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: 'Name' }).fill(name);
    await dialog.getByRole('button', { name: 'Save' }).click();
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();

    const picker = page.getByRole('combobox', { name: `Swap ${name} for another Weight Table` });
    const cell = page.getByRole('table').getByRole('row').nth(1).getByRole('cell').first();
    const tag = cell.getByText('Custom', { exact: true });
    await expect(tag).toBeVisible();
    // The main column is 1220px wide.
    expect((await page.locator('main').boundingBox())?.width).toBe(1220);

    // The picker is as wide as its name needs: freed from its cap and from shrinking, it would be no wider.
    const squeezedBy = await picker.evaluate((select: HTMLSelectElement) => {
      const width = select.getBoundingClientRect().width;
      select.style.maxWidth = 'none';
      select.style.flex = 'none';
      const free = select.getBoundingClientRect().width;
      select.style.maxWidth = '';
      select.style.flex = '';
      return free - width;
    });
    expect(squeezedBy).toBeLessThanOrEqual(0.5);

    // The tag sits whole inside the cell.
    const tagBox = await tag.boundingBox();
    const cellBox = await cell.boundingBox();
    if (!tagBox || !cellBox) throw new Error('Nothing to measure');
    expect(tagBox.x + tagBox.width).toBeLessThanOrEqual(cellBox.x + cellBox.width);
  });
});

test.describe('the weights dialog', () => {
  test('closes on Escape or a click on the dimmed area, but not on its own edge', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'The phone layout comes with ticket 21.');
    await page.goto('#evaluation');
    await page.getByRole('combobox', { name: 'Add a Weight Table' }).selectOption('Mornye');
    await page.getByRole('button', { name: 'Weights of Mornye' }).click();
    const dialog = page.getByRole('dialog');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Weights of Mornye' })).toBeFocused();

    await page.getByRole('button', { name: 'Weights of Mornye' }).click();
    const box = await dialog.boundingBox();
    if (!box) throw new Error('Nothing to measure');

    // The dialog's border, at its very edge, is inside it.
    await page.mouse.click(box.x + 1, box.y + box.height / 2);
    await expect(dialog).toBeVisible();

    await page.mouse.click(Math.max(2, box.x - 6), box.y + box.height / 2);
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Weights of Mornye' })).toBeFocused();
  });
});
