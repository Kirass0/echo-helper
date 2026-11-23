import { expect, test } from '@playwright/test';

test.describe('Tooltips', () => {
  test('a term opens its tooltip below itself, within 290px and the viewport', async ({
    page,
    isMobile,
  }) => {
    await page.goto('#evaluation');
    await page.getByRole('combobox', { name: 'Add a Weight Table' }).selectOption('Mornye');
    // On a phone the cards have no header row; the list's heading carries the term.
    const term = page.getByRole('button', {
      name: isMobile ? 'Substat Weight Tables' : 'Weight Table',
      exact: true,
    });
    await term.focus();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toHaveText('Determines how much each Substat is worth.');

    const termBox = await term.boundingBox();
    const tipBox = await tooltip.boundingBox();
    const viewport = page.viewportSize();
    if (!termBox || !tipBox || !viewport) throw new Error('Nothing to measure');
    expect(tipBox.y).toBeGreaterThanOrEqual(termBox.y + termBox.height);
    expect(tipBox.width).toBeLessThanOrEqual(Math.min(290, viewport.width - 20));
    expect(tipBox.x).toBeGreaterThanOrEqual(10);
    expect(tipBox.x + tipBox.width).toBeLessThanOrEqual(viewport.width - 10);

    await page.keyboard.press('Escape');
    await expect(tooltip).toBeHidden();
    await expect(term).toBeFocused();
  });

  test('the theme button shows its tooltip on focus', async ({ page }) => {
    await page.goto('#evaluation');
    await page.getByRole('button', { name: /^Switch to (light|dark) theme$/ }).focus();
    await expect(page.getByRole('tooltip')).toHaveText(/^Switch to (light|dark) theme$/);
  });
});
