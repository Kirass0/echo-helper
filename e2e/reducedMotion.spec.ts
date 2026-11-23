import { expect, test, type Page } from '@playwright/test';

// A player who asks for reduced motion (spec §15, "Reduced motion").
test.use({ reducedMotion: 'reduce' });

/** Every element, or its ::before or ::after, that has a transition or an animation. */
const moving = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('*')].flatMap((element) =>
      [null, '::before', '::after'].flatMap((pseudo) => {
        const style = getComputedStyle(element, pseudo);
        const durations = style.transitionDuration
          .split(',')
          .map((duration) => parseFloat(duration));
        return durations.some((duration) => duration > 0) || style.animationName !== 'none'
          ? [`${element.tagName.toLowerCase()}.${element.className}${pseudo ?? ''}`]
          : [];
      }),
    ),
  );

/** Whether the page stays where it is now: a smooth scroll would still be on its way. */
async function scrollEnded(page: Page) {
  const now = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(500);
  return (await page.evaluate(() => window.scrollY)) === now;
}

async function openStrategy(page: Page) {
  await page.goto('#strategy');
  await page.getByRole('combobox', { name: 'Substat Weight Table' }).selectOption('Mornye');
  await expect(
    page
      .getByRole('region', { name: 'Results' })
      .getByText(/^\d+\.\d%$/)
      .first(),
  ).toBeVisible();
}

test.describe('Reduced motion', () => {
  test('nothing moves: Discard Rate bars, sheets, the paired chart', async ({ page }) => {
    await openStrategy(page);
    expect(await moving(page)).toEqual([]);

    // The example-replace confirmation: a bottom sheet on a phone, which then doesn't slide in.
    await page
      .getByRole('combobox', { name: 'Start from an example' })
      .selectOption('Keep every Echo');
    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    expect(await sheet.evaluate((element) => element.getAnimations().length)).toBe(0);
    expect(await moving(page)).toEqual([]);
    await sheet.getByRole('button', { name: 'Cancel' }).click();

    await page.getByRole('button', { name: 'Compare with another strategy' }).click();
    await expect(page.getByTestId('paired-chart')).toBeAttached();
    expect(await moving(page)).toEqual([]);
  });

  test('nothing moves on About, its accordion included', async ({ page }) => {
    await page.goto('#about');
    await expect(page.locator('#about-credits')).toBeAttached();
    expect(await moving(page)).toEqual([]);
  });

  test('nothing moves on Echo Evaluation', async ({ page }) => {
    await page.goto('#evaluation');
    await page.getByRole('combobox', { name: 'Add a Weight Table' }).selectOption('Mornye');
    await expect(page.getByRole('group', { name: 'Echo Score', exact: true })).toContainText(
      '0.00',
    );
    expect(await moving(page)).toEqual([]);
  });

  test('the pending fade still applies, at once', async ({ page }) => {
    await openStrategy(page);
    // An unfinished rule leaves the results from before, faded as while calculating.
    await page
      .getByRole('region', { name: 'Tune Stage 3/5 (+15)' })
      .getByRole('button', { name: '+ add a rule' })
      .click();
    const faded = page
      .getByRole('region', { name: 'Results' })
      .locator('div', { hasText: /^\d+\.\d%/ })
      .first();
    expect(
      await faded.evaluate((element) => {
        const style = getComputedStyle(element);
        return { opacity: style.opacity, transition: style.transitionDuration };
      }),
    ).toEqual({ opacity: '0.42', transition: '0s' });
  });

  test('About anchors jump to their section', async ({ page }) => {
    await page.goto('#strategy');
    await page.getByRole('link', { name: 'How it works' }).click();
    // Read as soon as the page has scrolled at all: a smooth scroll would only have started.
    await page.waitForFunction(() => window.scrollY > 0);
    expect(await scrollEnded(page)).toBe(true);
    await expect(page.locator('#about-upgrade-strategies')).toBeInViewport();
  });

  test.describe('phone', () => {
    test.skip(({ isMobile }) => !isMobile, 'phone only');

    test('the "Results" link jumps to the results panel', async ({ page }) => {
      await openStrategy(page);
      const results = page.getByRole('region', { name: 'Results' });
      await page
        .getByRole('complementary', { name: 'Results summary' })
        .getByRole('button', { name: 'Results' })
        .click();
      await page.waitForFunction(() => window.scrollY > 0);
      expect(await scrollEnded(page)).toBe(true);
      await expect(results).toBeInViewport();
    });
  });
});
