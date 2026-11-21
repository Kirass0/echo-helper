import { expect, test, type Page } from '@playwright/test';

function theme(page: Page) {
  return page.evaluate(() => ({
    attr: document.documentElement.dataset.theme,
    colorScheme: getComputedStyle(document.documentElement).colorScheme,
    background: getComputedStyle(document.body).backgroundColor,
  }));
}

test.describe('first open with the OS set to light', () => {
  test.use({ colorScheme: 'light' });

  test('opens dark anyway', async ({ page }) => {
    await page.goto('#evaluation');
    expect(await theme(page)).toEqual({
      attr: 'dark',
      colorScheme: 'dark',
      background: 'rgb(18, 23, 34)',
    });
    await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible();
  });
});

test.describe('theme', () => {
  test('switches to light, survives a reload with no flash of dark', async ({ page }) => {
    await page.goto('#evaluation');
    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    expect(await theme(page)).toEqual({
      attr: 'light',
      colorScheme: 'light',
      background: 'rgb(243, 245, 249)',
    });
    await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible();

    // Record the theme the moment <body> first exists, before any bundle code runs.
    await page.addInitScript(() => {
      new MutationObserver((_, observer) => {
        if (!document.body) return;
        (window as unknown as { firstTheme: string | undefined }).firstTheme =
          document.documentElement.dataset.theme;
        observer.disconnect();
      }).observe(document, { childList: true, subtree: true });
    });
    await page.reload();
    expect(
      await page.evaluate(() => (window as unknown as { firstTheme: string }).firstTheme),
    ).toBe('light');
    expect((await theme(page)).attr).toBe('light');
  });

  test('a switch in one tab is taken on by another open tab', async ({ context }) => {
    const first = await context.newPage();
    const second = await context.newPage();
    await first.goto('#evaluation');
    await second.goto('#strategy');
    await first.getByRole('button', { name: 'Switch to light theme' }).click();
    await expect(second.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(second.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible();
  });

  test('the theme button sits at the header’s far right with a 24×24px hit area', async ({
    page,
  }) => {
    await page.goto('#evaluation');
    const button = await page.getByRole('button', { name: 'Switch to light theme' }).boundingBox();
    const date = await page.getByText(/^Updated /).boundingBox();
    if (!button || !date) throw new Error('header parts not visible');
    expect(button.width).toBeGreaterThanOrEqual(24);
    expect(button.height).toBeGreaterThanOrEqual(24);
    expect(button.x).toBeGreaterThan(date.x);
  });

  test('there is no theme-color meta tag', async ({ page }) => {
    await page.goto('#evaluation');
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(0);
  });

  test('everything is set in the self-hosted Onest', async ({ page }) => {
    await page.goto('#evaluation');
    await page.evaluate(() => document.fonts.ready);
    const loaded = await page.evaluate(() =>
      document.fonts.check('15px "Onest Variable"', 'Echo Helper 0123456789'),
    );
    expect(loaded).toBe(true);
    const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(family).toMatch(/^"Onest Variable"/);
  });
});

test.describe('storage that cannot be used', () => {
  test('the app still works and switches theme for the visit', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('blocked', 'SecurityError');
        },
      });
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('#evaluation');
    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    expect((await theme(page)).attr).toBe('light');
    expect(errors).toEqual([]);
  });
});
