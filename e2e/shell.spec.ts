import { expect, test, type Page } from '@playwright/test';

const TITLE = 'Echo Helper — Wuthering Waves Echo tuning calculator';

function openTab(page: Page) {
  return page.locator('header a[aria-current="page"]');
}

test.describe('app shell', () => {
  test('Echo Evaluation opens from its hash and shows its purpose line', async ({ page }) => {
    await page.goto('#evaluation');
    await expect(openTab(page)).toHaveText('Echo Evaluation');
    await expect(page.getByText('Check how good an Echo is for a Resonator')).toBeVisible();
    await expect(page).toHaveTitle(TITLE);
  });

  test('an empty hash opens Echo Evaluation', async ({ page }) => {
    await page.goto('');
    await expect(openTab(page)).toHaveText('Echo Evaluation');
  });

  test('Upgrade Strategy opens from its hash and shows its purpose line', async ({ page }) => {
    await page.goto('#strategy');
    await expect(openTab(page)).toHaveText('Upgrade Strategy');
    await expect(
      page.getByText('Try different Upgrade Strategies and compare what they cost.'),
    ).toBeVisible();
    await expect(page).toHaveTitle(TITLE);
  });

  test('About opens from its hash, and "How it works" reaches it', async ({ page }) => {
    await page.goto('#about');
    await expect(openTab(page)).toHaveText('About');
    await expect(page.getByRole('link', { name: 'How it works' })).toHaveCount(0);
    await expect(page).toHaveTitle(TITLE);

    await page.goto('#strategy');
    await page.getByRole('link', { name: 'How it works' }).click();
    await expect(page).toHaveURL(/#about-upgrade-strategies$/);
    await expect(openTab(page)).toHaveText('About');
  });

  test('the header shows the build date on every tab', async ({ page }) => {
    for (const hash of ['#evaluation', '#strategy', '#about']) {
      await page.goto(hash);
      await expect(page.getByRole('banner')).toContainText(/Updated \d{1,2} [A-Z][a-z]{2} \d{4}/);
    }
  });

  test('the app makes no requests outside its own origin', async ({ page, baseURL }) => {
    const origin = new URL(baseURL ?? '').origin;
    const foreign: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).origin !== origin) foreign.push(request.url());
    });
    await page.goto('#evaluation');
    await page.waitForLoadState('networkidle');
    expect(foreign).toEqual([]);
    expect(await page.context().cookies()).toEqual([]);
    expect(await page.evaluate(() => navigator.serviceWorker.getRegistrations())).toHaveLength(0);
  });
});

test.describe('phone header', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone width only');

  test('row 1 holds the name and the date, row 2 holds the tabs', async ({ page }) => {
    await page.goto('#evaluation');
    const name = await page.getByText('Echo Helper', { exact: true }).boundingBox();
    const date = await page.getByText(/^Updated /).boundingBox();
    const tabs = await page.getByRole('navigation', { name: 'Tabs' }).boundingBox();
    if (!name || !date || !tabs) throw new Error('header parts not visible');

    // Name and date share a row, name on the left.
    expect(Math.abs(name.y + name.height / 2 - (date.y + date.height / 2))).toBeLessThan(8);
    expect(name.x).toBeLessThan(date.x);
    // Tabs sit on a row below.
    expect(tabs.y).toBeGreaterThanOrEqual(name.y + name.height - 1);
    // Nothing scrolls sideways.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });

  test('the header fits at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('#evaluation');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});
