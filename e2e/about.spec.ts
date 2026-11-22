import { expect, test } from '@playwright/test';

test.describe('About', () => {
  test('"How it works" on Echo Evaluation lands on its open section', async ({
    page,
    isMobile,
  }) => {
    await page.goto('#evaluation');
    await page.getByRole('link', { name: 'How it works' }).click();
    await expect(page).toHaveURL(/#about-evaluating-an-echo$/);

    const section = page.locator('#about-evaluating-an-echo');
    await expect(section.getByText('60 equal bands', { exact: false })).toBeVisible();
    await expect(section.getByText('Evaluating an Echo', { exact: true }).first()).toBeInViewport();
    if (isMobile) {
      await expect(section).toHaveAttribute('open', '');
      await expect(page.locator('#about-credits')).not.toHaveAttribute('open');
    } else {
      await expect(
        page
          .getByRole('navigation', { name: 'About sections' })
          .getByRole('link', { name: 'Evaluating an Echo' }),
      ).toHaveAttribute('aria-current', 'true');
    }
  });

  test('"How it works" on Upgrade Strategy lands on its open section', async ({ page }) => {
    await page.goto('#strategy');
    await page.getByRole('link', { name: 'How it works' }).click();
    const section = page.locator('#about-upgrade-strategies');
    await expect(section.getByText('Discarding an Echo refunds', { exact: false })).toBeVisible();
    await expect(section.getByText('Upgrade Strategies', { exact: true }).first()).toBeInViewport();
  });

  test.describe('desktop', () => {
    test.skip(({ isMobile }) => isMobile, 'desktop only');

    test('the side panel stays in view and marks the section scrolled to', async ({ page }) => {
      await page.goto('#about');
      const panel = page.getByRole('navigation', { name: 'About sections' });
      await panel.getByRole('link', { name: 'Credits' }).click();
      await expect(page).toHaveURL(/#about-credits$/);
      await expect(panel).toBeInViewport();
      await expect(panel.getByRole('link', { name: 'Credits' })).toHaveAttribute(
        'aria-current',
        'true',
      );
      await expect(panel.locator('[aria-current]')).toHaveCount(1);

      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(panel.getByRole('link', { name: 'What Echo Helper does' })).toHaveAttribute(
        'aria-current',
        'true',
      );
    });
  });

  test.describe('phone', () => {
    test.skip(({ isMobile }) => !isMobile, 'phone width only');

    test('is an accordion where several sections stay open, with nothing scrolling sideways', async ({
      page,
    }) => {
      await page.goto('#about');
      await expect(page.getByRole('navigation', { name: 'About sections' })).toHaveCount(0);
      await page.locator('#about-credits summary').click();
      await page.locator('#about-disclaimer summary').click();
      await expect(page.locator('#about-credits')).toHaveAttribute('open', '');
      await expect(page.locator('#about-disclaimer')).toHaveAttribute('open', '');
      await page.locator('#about-echo-score-and-reference-rolls summary').click();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflow).toBe(false);
    });
  });
});
