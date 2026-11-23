import { expect, test, type Locator, type Page } from '@playwright/test';

/** Whether anything on the page scrolls sideways. */
const scrollsSideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

async function box(locator: Locator) {
  const found = await locator.boundingBox();
  if (!found) throw new Error('Nothing to measure');
  return found;
}

/** Upgrade Strategy with Mornye and the first visit's "Crit first", its results in. */
async function openCritFirst(page: Page) {
  await page.goto('#strategy');
  await page.getByRole('combobox', { name: 'Substat Weight Table' }).selectOption('Mornye');
  await expect(
    page
      .getByRole('region', { name: 'Results' })
      .getByText(/^\d+\.\d%$/)
      .first(),
  ).toBeVisible();
}

/** Replaces the strategy with an example, which asks first: "Crit first" has rules. */
async function loadExample(page: Page, name: string) {
  await page.getByRole('combobox', { name: 'Start from an example' }).first().selectOption(name);
  await page.getByRole('dialog').getByRole('button', { name: 'Replace' }).click();
}

test.describe('Upgrade Strategy on a tablet', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop browser at tablet width');

  test('puts the results above the stages, in one column', async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 900 });
    await openCritFirst(page);
    const results = await box(page.getByRole('region', { name: 'Results' }));
    const firstStage = await box(page.getByRole('region', { name: 'Tune Stage 1/5 (+5)' }));
    expect(results.y + results.height).toBeLessThan(firstStage.y);
    // The full width of the page's content, as the stages' panel.
    expect(results.width).toBeGreaterThan(700 - 2 * 20 - 2);
    expect(await scrollsSideways(page)).toBe(false);
  });
});

test.describe('Upgrade Strategy on a phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone width only');

  test('scrolls nothing sideways, down to 320px, editing or comparing', async ({ page }) => {
    await openCritFirst(page);
    await loadExample(page, 'Chance to reach a Top 5% Echo');
    // An unfinished rule, with its message in the results panel.
    await page.getByRole('button', { name: '+ or' }).first().click();
    await expect(page.getByRole('region', { name: 'Results' })).toContainText(
      'Results are from before your last change.',
    );
    for (const width of [412, 360, 320]) {
      await page.setViewportSize({ width, height: 800 });
      expect(await scrollsSideways(page), `editing at ${width}px`).toBe(false);
    }

    await page.getByRole('button', { name: 'Compare with another strategy' }).click();
    await page
      .getByRole('region', { name: 'Strategy B' })
      .getByRole('combobox', { name: 'Start from an example' })
      .selectOption('Double crit, or one great crit roll');
    await expect(
      page.getByRole('region', { name: 'B compared with A' }).getByText(/^[+−]\d+\.\d%$/),
    ).not.toHaveCount(0);
    for (const side of ['B', 'A'])
      for (const width of [412, 360, 320]) {
        await page.getByRole('button', { name: `Strategy ${side}`, exact: true }).click();
        await page.setViewportSize({ width, height: 800 });
        expect(await scrollsSideways(page), `comparing, ${side} at ${width}px`).toBe(false);
      }
  });

  test('gives the header’s pickers and Compare a full-width line each', async ({ page }) => {
    await openCritFirst(page);
    const table = await box(page.getByRole('combobox', { name: 'Substat Weight Table' }));
    const examples = await box(page.getByRole('combobox', { name: 'Start from an example' }));
    const compare = await box(page.getByRole('button', { name: 'Compare with another strategy' }));
    const stage = await box(page.getByRole('region', { name: 'Tune Stage 1/5 (+5)' }));
    expect(table.y + table.height).toBeLessThanOrEqual(examples.y);
    expect(examples.y + examples.height).toBeLessThanOrEqual(compare.y);
    // Each reaches the right edge of the page's content, where the stages' panel ends.
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('No viewport');
    expect(Math.round(compare.width)).toBe(viewport.width - 24);
    expect(Math.round(examples.x + examples.width)).toBe(viewport.width - 12);
    expect(stage.x).toBeGreaterThan(12);
  });

  test('stacks each stage and puts a rule’s kind picker and × on its first line', async ({
    page,
  }) => {
    await openCritFirst(page);
    await loadExample(page, 'Chance to reach a Top 5% Echo');
    await page.setViewportSize({ width: 360, height: 800 });
    const stage = page.getByRole('region', { name: 'Tune Stage 5/5 (+25)' });
    const kind = stage.getByRole('combobox', { name: 'Kind of rule' }).first();
    await kind.selectOption('Target Chance');
    const rule = stage.locator('[data-rule]').first();
    await rule.getByRole('textbox', { name: 'Chance in %' }).fill('25');
    await rule.getByRole('textbox', { name: 'Target Score' }).fill('20');
    await stage.scrollIntoViewIfNeeded();
    const name = await box(stage.getByRole('heading'));
    const discarded = await box(stage.getByText('discarded here'));
    const kindBox = await box(kind);
    expect(name.y + name.height).toBeLessThanOrEqual(discarded.y);
    expect(discarded.y + discarded.height).toBeLessThanOrEqual(kindBox.y);

    const remove = await box(rule.getByRole('button', { name: 'Remove this rule' }));
    const ruleBox = await box(rule);
    expect(Math.abs(remove.y + remove.height / 2 - (kindBox.y + kindBox.height / 2))).toBeLessThan(
      2,
    );
    expect(Math.round(remove.x + remove.width)).toBe(Math.round(ruleBox.x + ruleBox.width));
    // The Target Chance phrase wraps on the three lines below.
    const chance = await box(rule.getByRole('textbox', { name: 'Chance in %' }));
    const target = await box(rule.getByRole('textbox', { name: 'Target Score' }));
    expect(chance.y).toBeGreaterThan(kindBox.y + kindBox.height);
    expect(target.y).toBeGreaterThan(chance.y + chance.height);
    // The lines the phrase's words and fields sit on, below the kind picker's.
    const lines = await rule.evaluate((element, below) => {
      const middles: number[] = [];
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim() || node.parentElement?.closest('select, button')) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) middles.push(rect.top + rect.height / 2);
      }
      for (const input of element.querySelectorAll('input')) {
        const rect = input.getBoundingClientRect();
        middles.push(rect.top + rect.height / 2);
      }
      const rows: number[] = [];
      for (const middle of middles.filter((m) => m > below).sort((a, b) => a - b))
        if (rows.every((row) => Math.abs(row - middle) > 6)) rows.push(middle);
      return rows.length;
    }, kindBox.y + kindBox.height);
    expect(lines).toBe(3);
  });

  test('keeps the Success Rate in a bar at the bottom whose "Results" link scrolls to the panel', async ({
    page,
  }) => {
    await openCritFirst(page);
    const bar = page.getByRole('complementary', { name: 'Results summary' });
    const results = page.getByRole('region', { name: 'Results' });
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('No viewport');
    const barBox = await box(bar);
    expect(Math.round(barBox.y + barBox.height)).toBe(viewport.height);
    expect(Math.round(barBox.width)).toBe(viewport.width);
    await expect(bar).toContainText(/^\d+\.\d% Success Rate/);

    // The full results sit below the stages.
    const lastStage = await box(page.getByRole('region', { name: 'Tune Stage 5/5 (+25)' }));
    expect((await box(results)).y).toBeGreaterThan(lastStage.y + lastStage.height);
    await expect(results).not.toBeInViewport();

    await bar.getByRole('button', { name: 'Results' }).click();
    await expect(results).toBeInViewport();
    await expect(results).toBeFocused();

    // At the very bottom, the bar covers nothing of the page.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const end = await box(results);
    expect(end.y + end.height).toBeLessThanOrEqual((await box(bar)).y);
  });

  test('opens the Substat Count picker and the example-replace confirmation as bottom sheets', async ({
    page,
  }) => {
    await openCritFirst(page);
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('No viewport');
    const atBottom = async (sheet: Locator) => {
      await sheet.evaluate((element) =>
        Promise.all(element.getAnimations().map((a) => a.finished)),
      );
      const found = await box(sheet);
      expect(Math.round(found.width)).toBe(viewport.width);
      expect(Math.round(found.y + found.height)).toBe(viewport.height);
    };

    await page
      .getByRole('region', { name: 'Tune Stage 2/5 (+10)' })
      .getByRole('button', { name: 'Crit Rate, Crit Damage' })
      .click();
    const substats = page.getByRole('dialog', { name: 'Substats' });
    await atBottom(substats);
    await expect(substats.getByRole('checkbox')).toHaveCount(13);
    await substats.getByRole('button', { name: 'Done' }).click();
    await expect(substats).toBeHidden();

    await page
      .getByRole('combobox', { name: 'Start from an example' })
      .selectOption('Keep every Echo');
    const confirm = page.getByRole('dialog');
    await atBottom(confirm);
    await confirm.getByRole('button', { name: 'Cancel' }).click();
  });

  test('compares one strategy at a time, with stacked rows, short chart labels and no bar', async ({
    page,
  }) => {
    await openCritFirst(page);
    await page.getByRole('button', { name: 'Compare with another strategy' }).click();
    await expect(page.getByRole('complementary', { name: 'Results summary' })).toHaveCount(0);
    const a = page.getByRole('button', { name: 'Strategy A', exact: true });
    const b = page.getByRole('button', { name: 'Strategy B', exact: true });
    await expect(b).toHaveAttribute('aria-pressed', 'true');
    await a.click();
    await expect(a).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('region', { name: 'Strategy A' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Strategy B' })).toHaveCount(0);

    const comparison = page.getByRole('region', { name: 'B compared with A' });
    const row = comparison.getByRole('listitem').first();
    const label = await box(row.getByText('Echoes started per Successful Echo'));
    const valueA = await box(row.getByText('A', { exact: true }));
    expect(valueA.y).toBeGreaterThanOrEqual(label.y + label.height);
    await expect(comparison.getByTestId('paired-chart')).toContainText('1/5');
    await expect(comparison.getByTestId('paired-chart')).toContainText('Succ.');
  });
});
