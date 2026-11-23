import { expect, test, type Locator, type Page } from '@playwright/test';

/** Whether anything on the page scrolls sideways. */
const scrollsSideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

/** Waits for a sheet to finish sliding in. */
const settled = (sheet: Locator) =>
  sheet.evaluate((element) => Promise.all(element.getAnimations().map((a) => a.finished)));

async function addSubstat(page: Page, type: string, value: string) {
  await page.getByRole('button', { name: /^Add the Substat revealed at/ }).click();
  await page.getByRole('button', { name: type, exact: true }).click();
  await page.getByRole('button', { name: value, exact: true }).click();
}

test.describe('Echo Evaluation on a phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone width only');

  test('scrolls nothing sideways, down to 320px', async ({ page }) => {
    await page.goto('#evaluation');
    await addSubstat(page, 'Crit Rate', '8.1%');
    await addSubstat(page, 'Crit Damage', '16.2%');
    const add = page.getByRole('combobox', { name: 'Add a Weight Table' });
    await add.selectOption({ label: 'New Custom Weight Table…' });
    const sheet = page.getByRole('dialog');
    await sheet.getByRole('textbox', { name: 'Name' }).fill('Changli (my rotation, quickswap)');
    await sheet.getByRole('button', { name: 'Save' }).click();
    await sheet.getByRole('button', { name: 'Close' }).click();
    await add.selectOption('Mornye');
    await add.selectOption('Cartethyia');
    await page.getByRole('textbox', { name: 'Target Score for Mornye', exact: true }).fill('20');
    await page.getByRole('textbox', { name: 'ER Target Score for Mornye', exact: true }).fill('-');
    // The type grid open in its slot.
    await page.getByRole('button', { name: /^Add the Substat revealed at/ }).click();

    for (const width of [412, 360, 320]) {
      await page.setViewportSize({ width, height: 800 });
      expect(await scrollsSideways(page), `at ${width}px`).toBe(false);
    }

    // At 5/5, where the boxes read Reached or Not reached.
    await page.getByRole('button', { name: 'HP%', exact: true }).click();
    await page.getByRole('button', { name: '8.6%', exact: true }).click();
    await addSubstat(page, 'Flat DEF', '50');
    await addSubstat(page, 'Energy Regen', '9.2%');
    await page
      .getByRole('textbox', { name: 'Target Score for Cartethyia', exact: true })
      .fill('30');
    await page
      .getByRole('textbox', { name: 'ER Target Score for Cartethyia', exact: true })
      .fill('5');
    await expect(
      page.getByRole('group', { name: 'Target Score', exact: true }).first(),
    ).toContainText(/Reached|Not reached/);
    expect(await scrollsSideways(page)).toBe(false);
  });

  test('orders Your Echo, the results, then the list of cards with the add picker below', async ({
    page,
  }) => {
    await page.goto('#evaluation');
    await addSubstat(page, 'Crit Rate', '8.1%');
    const add = page.getByRole('combobox', { name: 'Add a Weight Table' });
    await add.selectOption('Mornye');
    await add.selectOption('Jinhsi');
    const top = async (selector: string) =>
      (await page.locator(selector).first().boundingBox())?.y ?? NaN;
    const echo = await top('section[aria-label="Your Echo"]');
    const results = await top('section[aria-label="Results"]');
    const cards = page.getByRole('list', { name: 'Substat Weight Tables' }).getByRole('listitem');
    const list = (await cards.first().boundingBox())?.y ?? NaN;
    const addAt = (await add.boundingBox())?.y ?? NaN;
    expect(echo).toBeLessThan(results);
    expect(results).toBeLessThan(list);
    expect(list).toBeLessThan(addAt);

    // A tap outside a card's controls puts it in focus.
    await expect(cards.nth(1)).toHaveAttribute('aria-current', 'true');
    await cards.nth(0).getByRole('group', { name: 'Echo Score for Mornye' }).click();
    await expect(cards.nth(0)).toHaveAttribute('aria-current', 'true');
    await expect(page.getByRole('heading', { name: 'Mornye' })).toBeVisible();
  });

  test('opens the weights as a bottom sheet that a tap on the dimmed area closes', async ({
    page,
  }) => {
    await page.goto('#evaluation');
    await page.getByRole('combobox', { name: 'Add a Weight Table' }).selectOption('Mornye');
    const opener = page.getByRole('button', { name: 'Weights of Mornye' });
    await opener.click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toHaveAccessibleName('Mornye');
    await expect(sheet).toBeVisible();
    await settled(sheet);
    // A grab handle above the title.
    await expect(sheet.locator('[aria-hidden="true"]').first()).toBeVisible();
    const viewport = page.viewportSize();
    const box = await sheet.boundingBox();
    if (!box || !viewport) throw new Error('Nothing to measure');
    // Full width, against the bottom edge, at most 85% of the height.
    expect(Math.round(box.x)).toBe(0);
    expect(Math.round(box.width)).toBe(viewport.width);
    expect(Math.round(box.y + box.height)).toBe(viewport.height);
    expect(box.height).toBeLessThanOrEqual(viewport.height * 0.85 + 1);

    // A long sheet scrolls inside: the Custom editor, at a short screen.
    await page.setViewportSize({ width: viewport.width, height: 500 });
    await sheet.getByRole('button', { name: 'Duplicate' }).click();
    const editor = await sheet.boundingBox();
    if (!editor) throw new Error('Nothing to measure');
    expect(editor.height).toBeLessThanOrEqual(500 * 0.85 + 1);
    await sheet.getByRole('button', { name: 'Cancel' }).click();

    // The sheet's own top edge is inside it; the dimmed area above it is not.
    const shown = await sheet.boundingBox();
    if (!shown) throw new Error('Nothing to measure');
    await page.mouse.click(shown.x + shown.width / 2, shown.y + 1);
    await expect(sheet).toBeVisible();
    await page.mouse.click(shown.x + shown.width / 2, shown.y - 20);
    await expect(sheet).toBeHidden();
    await expect(opener).toBeFocused();
  });
});
